import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type FilingType = 'registration' | 'notification' | 'report' | 'license' | 'permit' | 'certification' | 'renewal';
export type FilingStatus = 'pending' | 'submitted' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
export type ChangeType = 'new_regulation' | 'amendment' | 'repeal' | 'guidance' | 'interpretation' | 'enforcement';
export type ChangeStatus = 'monitoring' | 'assessed' | 'implementing' | 'implemented' | 'archived';
export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';
export type RequirementStatus = 'active' | 'inactive' | 'archived' | 'non_compliant' | 'compliant';
export type SubmissionStatus = 'draft' | 'submitted' | 'responded' | 'archived';
export type MonitoringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type MonitoringStatus = 'active' | 'paused' | 'archived';

// ── Memory row ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string | null;
  sourceId: string | null;
  confidence: number | null;
  owner: string | null;
  accessPolicy: string | null;
  lifecycle: string | null;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Content payloads ──

interface FilingContent {
  title: string;
  type: FilingType;
  jurisdiction: string;
  agency: string;
  status: FilingStatus;
  dueDate: string | null;
  submittedDate: string | null;
  acceptedDate: string | null;
  description: string;
  attachments: string[];
  requirements: string[];
  fees: string;
  notes: string;
  submittedBy: string | null;
  acceptedBy: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
}

interface ChangeContent {
  title: string;
  type: ChangeType;
  jurisdiction: string;
  agency: string;
  description: string;
  effectiveDate: string | null;
  impactLevel: ImpactLevel;
  impactAreas: string[];
  status: ChangeStatus;
  source: string;
  reference: string;
  impactAssessment: string;
  assessedBy: string | null;
  assessedAt: string | null;
  implementationPlan: string;
  implementedBy: string | null;
  implementedAt: string | null;
}

interface RequirementContent {
  title: string;
  description: string;
  jurisdiction: string;
  agency: string;
  category: string;
  frequency: string;
  owner: string;
  status: RequirementStatus;
  lastAssessed: string | null;
  nextAssessment: string | null;
  evidence: string[];
  references: string[];
  assessment: string;
  assessedBy: string | null;
  assessedAt: string | null;
}

interface SubmissionContent {
  filingId: string | null;
  title: string;
  type: string;
  recipient: string;
  submittedDate: string | null;
  status: SubmissionStatus;
  content: string;
  attachments: string[];
  response: string;
  responseDate: string | null;
  submittedBy: string | null;
}

interface MonitoringContent {
  topic: string;
  jurisdiction: string;
  agency: string;
  sources: string[];
  frequency: MonitoringFrequency;
  status: MonitoringStatus;
  lastChecked: string | null;
  findings: Array<{ date: string; description: string; severity: string }>;
  assignedTo: string;
  alerts: Array<{ date: string; message: string; level: string }>;
}

// ── Public interfaces ──

export interface RegulatoryFiling {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: FilingType;
  jurisdiction: string;
  agency: string;
  status: FilingStatus;
  dueDate: Date | null;
  submittedDate: Date | null;
  acceptedDate: Date | null;
  description: string;
  attachments: string[];
  requirements: string[];
  fees: string;
  notes: string;
  submittedBy: string | null;
  acceptedBy: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatoryChange {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: ChangeType;
  jurisdiction: string;
  agency: string;
  description: string;
  effectiveDate: Date | null;
  impactLevel: ImpactLevel;
  impactAreas: string[];
  status: ChangeStatus;
  source: string;
  reference: string;
  impactAssessment: string;
  assessedBy: string | null;
  assessedAt: Date | null;
  implementationPlan: string;
  implementedBy: string | null;
  implementedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatoryRequirement {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  jurisdiction: string;
  agency: string;
  category: string;
  frequency: string;
  owner: string;
  status: RequirementStatus;
  lastAssessed: Date | null;
  nextAssessment: Date | null;
  evidence: string[];
  references: string[];
  assessment: string;
  assessedBy: string | null;
  assessedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatorySubmission {
  id: string;
  organizationId: string;
  workspaceId: string;
  filingId: string | null;
  title: string;
  type: string;
  recipient: string;
  submittedDate: Date | null;
  status: SubmissionStatus;
  content: string;
  attachments: string[];
  response: string;
  responseDate: Date | null;
  submittedBy: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatoryMonitoring {
  id: string;
  organizationId: string;
  workspaceId: string;
  topic: string;
  jurisdiction: string;
  agency: string;
  sources: string[];
  frequency: MonitoringFrequency;
  status: MonitoringStatus;
  lastChecked: Date | null;
  findings: Array<{ date: Date; description: string; severity: string }>;
  assignedTo: string;
  alerts: Array<{ date: Date; message: string; level: string }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatoryMetrics {
  pendingFilings: number;
  upcomingDeadlines: number;
  highImpactChanges: number;
  complianceRate: number;
  monitoringCoverage: number;
  activeRequirements: number;
  openSubmissions: number;
}

export interface RegulatoryStats {
  filingCount: number;
  changeCount: number;
  requirementCount: number;
  submissionCount: number;
  monitoringCount: number;
  pendingFilingCount: number;
  acceptedFilingCount: number;
  rejectedFilingCount: number;
  highImpactChangeCount: number;
  activeRequirementCount: number;
  activeMonitoringCount: number;
  byFilingStatus: Record<string, number>;
  byChangeStatus: Record<string, number>;
  byRequirementStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateFilingInput {
  title: string;
  type: FilingType;
  jurisdiction: string;
  agency: string;
  status?: FilingStatus;
  dueDate?: string;
  submittedDate?: string;
  acceptedDate?: string;
  description?: string;
  attachments?: string[];
  requirements?: string[];
  fees?: string;
  notes?: string;
}

export interface UpdateFilingInput {
  title?: string;
  type?: FilingType;
  jurisdiction?: string;
  agency?: string;
  status?: FilingStatus;
  dueDate?: string;
  submittedDate?: string;
  acceptedDate?: string;
  description?: string;
  attachments?: string[];
  requirements?: string[];
  fees?: string;
  notes?: string;
}

export interface ListFilingsOpts {
  type?: FilingType;
  status?: FilingStatus;
  jurisdiction?: string;
  agency?: string;
}

export interface CreateChangeInput {
  title: string;
  type: ChangeType;
  jurisdiction: string;
  agency: string;
  description?: string;
  effectiveDate?: string;
  impactLevel: ImpactLevel;
  impactAreas?: string[];
  status?: ChangeStatus;
  source?: string;
  reference?: string;
}

export interface UpdateChangeInput {
  title?: string;
  type?: ChangeType;
  jurisdiction?: string;
  agency?: string;
  description?: string;
  effectiveDate?: string;
  impactLevel?: ImpactLevel;
  impactAreas?: string[];
  status?: ChangeStatus;
  source?: string;
  reference?: string;
}

export interface ListChangesOpts {
  type?: ChangeType;
  status?: ChangeStatus;
  jurisdiction?: string;
  impactLevel?: ImpactLevel;
}

export interface CreateRequirementInput {
  title: string;
  description?: string;
  jurisdiction: string;
  agency: string;
  category?: string;
  frequency?: string;
  owner?: string;
  status?: RequirementStatus;
  lastAssessed?: string;
  nextAssessment?: string;
  evidence?: string[];
  references?: string[];
}

export interface UpdateRequirementInput {
  title?: string;
  description?: string;
  jurisdiction?: string;
  agency?: string;
  category?: string;
  frequency?: string;
  owner?: string;
  status?: RequirementStatus;
  lastAssessed?: string;
  nextAssessment?: string;
  evidence?: string[];
  references?: string[];
}

export interface ListRequirementsOpts {
  jurisdiction?: string;
  category?: string;
  status?: RequirementStatus;
  owner?: string;
}

export interface CreateSubmissionInput {
  filingId?: string;
  title: string;
  type: string;
  recipient: string;
  submittedDate?: string;
  status?: SubmissionStatus;
  content?: string;
  attachments?: string[];
  response?: string;
  responseDate?: string;
}

export interface UpdateSubmissionInput {
  filingId?: string;
  title?: string;
  type?: string;
  recipient?: string;
  submittedDate?: string;
  status?: SubmissionStatus;
  content?: string;
  attachments?: string[];
  response?: string;
  responseDate?: string;
}

export interface ListSubmissionsOpts {
  filingId?: string;
  status?: SubmissionStatus;
  type?: string;
}

export interface CreateMonitoringInput {
  topic: string;
  jurisdiction: string;
  agency?: string;
  sources?: string[];
  frequency: MonitoringFrequency;
  status?: MonitoringStatus;
  lastChecked?: string;
  findings?: Array<{ date: string; description: string; severity: string }>;
  assignedTo?: string;
  alerts?: Array<{ date: string; message: string; level: string }>;
}

export interface UpdateMonitoringInput {
  topic?: string;
  jurisdiction?: string;
  agency?: string;
  sources?: string[];
  frequency?: MonitoringFrequency;
  status?: MonitoringStatus;
  lastChecked?: string;
  findings?: Array<{ date: string; description: string; severity: string }>;
  assignedTo?: string;
  alerts?: Array<{ date: string; message: string; level: string }>;
}

export interface ListMonitoringOpts {
  jurisdiction?: string;
  status?: MonitoringStatus;
  frequency?: MonitoringFrequency;
}

// ── Helpers ──

const fallbackFiling: FilingContent = {
  title: '', type: 'report', jurisdiction: '', agency: '', status: 'pending',
  dueDate: null, submittedDate: null, acceptedDate: null, description: '',
  attachments: [], requirements: [], fees: '', notes: '',
  submittedBy: null, acceptedBy: null, rejectedBy: null, rejectionReason: null,
};

const fallbackChange: ChangeContent = {
  title: '', type: 'new_regulation', jurisdiction: '', agency: '', description: '',
  effectiveDate: null, impactLevel: 'medium', impactAreas: [], status: 'monitoring',
  source: '', reference: '', impactAssessment: '', assessedBy: null, assessedAt: null,
  implementationPlan: '', implementedBy: null, implementedAt: null,
};

const fallbackRequirement: RequirementContent = {
  title: '', description: '', jurisdiction: '', agency: '', category: '', frequency: '',
  owner: '', status: 'active', lastAssessed: null, nextAssessment: null,
  evidence: [], references: [], assessment: '', assessedBy: null, assessedAt: null,
};

const fallbackSubmission: SubmissionContent = {
  filingId: null, title: '', type: '', recipient: '', submittedDate: null,
  status: 'draft', content: '', attachments: [], response: '', responseDate: null,
  submittedBy: null,
};

const fallbackMonitoring: MonitoringContent = {
  topic: '', jurisdiction: '', agency: '', sources: [], frequency: 'monthly',
  status: 'active', lastChecked: null, findings: [], assignedTo: '', alerts: [],
};

function parseFiling(raw: string): FilingContent {
  if (!raw) return fallbackFiling;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      type: (p.type as FilingType) ?? 'report',
      jurisdiction: p.jurisdiction ?? '',
      agency: p.agency ?? '',
      status: (p.status as FilingStatus) ?? 'pending',
      dueDate: p.dueDate ?? null,
      submittedDate: p.submittedDate ?? null,
      acceptedDate: p.acceptedDate ?? null,
      description: p.description ?? '',
      attachments: Array.isArray(p.attachments) ? p.attachments : [],
      requirements: Array.isArray(p.requirements) ? p.requirements : [],
      fees: p.fees ?? '',
      notes: p.notes ?? '',
      submittedBy: p.submittedBy ?? null,
      acceptedBy: p.acceptedBy ?? null,
      rejectedBy: p.rejectedBy ?? null,
      rejectionReason: p.rejectionReason ?? null,
    };
  } catch { return fallbackFiling; }
}

function parseChange(raw: string): ChangeContent {
  if (!raw) return fallbackChange;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      type: (p.type as ChangeType) ?? 'new_regulation',
      jurisdiction: p.jurisdiction ?? '',
      agency: p.agency ?? '',
      description: p.description ?? '',
      effectiveDate: p.effectiveDate ?? null,
      impactLevel: (p.impactLevel as ImpactLevel) ?? 'medium',
      impactAreas: Array.isArray(p.impactAreas) ? p.impactAreas : [],
      status: (p.status as ChangeStatus) ?? 'monitoring',
      source: p.source ?? '',
      reference: p.reference ?? '',
      impactAssessment: p.impactAssessment ?? '',
      assessedBy: p.assessedBy ?? null,
      assessedAt: p.assessedAt ?? null,
      implementationPlan: p.implementationPlan ?? '',
      implementedBy: p.implementedBy ?? null,
      implementedAt: p.implementedAt ?? null,
    };
  } catch { return fallbackChange; }
}

function parseRequirement(raw: string): RequirementContent {
  if (!raw) return fallbackRequirement;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      description: p.description ?? '',
      jurisdiction: p.jurisdiction ?? '',
      agency: p.agency ?? '',
      category: p.category ?? '',
      frequency: p.frequency ?? '',
      owner: p.owner ?? '',
      status: (p.status as RequirementStatus) ?? 'active',
      lastAssessed: p.lastAssessed ?? null,
      nextAssessment: p.nextAssessment ?? null,
      evidence: Array.isArray(p.evidence) ? p.evidence : [],
      references: Array.isArray(p.references) ? p.references : [],
      assessment: p.assessment ?? '',
      assessedBy: p.assessedBy ?? null,
      assessedAt: p.assessedAt ?? null,
    };
  } catch { return fallbackRequirement; }
}

function parseSubmission(raw: string): SubmissionContent {
  if (!raw) return fallbackSubmission;
  try {
    const p = JSON.parse(raw);
    return {
      filingId: p.filingId ?? null,
      title: p.title ?? '',
      type: p.type ?? '',
      recipient: p.recipient ?? '',
      submittedDate: p.submittedDate ?? null,
      status: (p.status as SubmissionStatus) ?? 'draft',
      content: p.content ?? '',
      attachments: Array.isArray(p.attachments) ? p.attachments : [],
      response: p.response ?? '',
      responseDate: p.responseDate ?? null,
      submittedBy: p.submittedBy ?? null,
    };
  } catch { return fallbackSubmission; }
}

function parseMonitoring(raw: string): MonitoringContent {
  if (!raw) return fallbackMonitoring;
  try {
    const p = JSON.parse(raw);
    return {
      topic: p.topic ?? '',
      jurisdiction: p.jurisdiction ?? '',
      agency: p.agency ?? '',
      sources: Array.isArray(p.sources) ? p.sources : [],
      frequency: (p.frequency as MonitoringFrequency) ?? 'monthly',
      status: (p.status as MonitoringStatus) ?? 'active',
      lastChecked: p.lastChecked ?? null,
      findings: Array.isArray(p.findings) ? p.findings : [],
      assignedTo: p.assignedTo ?? '',
      alerts: Array.isArray(p.alerts) ? p.alerts : [],
    };
  } catch { return fallbackMonitoring; }
}

function toFiling(row: MemoryRow): RegulatoryFiling {
  const c = parseFiling(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, type: c.type, jurisdiction: c.jurisdiction, agency: c.agency,
    status: c.status, dueDate: c.dueDate ? new Date(c.dueDate) : null,
    submittedDate: c.submittedDate ? new Date(c.submittedDate) : null,
    acceptedDate: c.acceptedDate ? new Date(c.acceptedDate) : null,
    description: c.description, attachments: c.attachments, requirements: c.requirements,
    fees: c.fees, notes: c.notes, submittedBy: c.submittedBy, acceptedBy: c.acceptedBy,
    rejectedBy: c.rejectedBy, rejectionReason: c.rejectionReason,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toChange(row: MemoryRow): RegulatoryChange {
  const c = parseChange(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, type: c.type, jurisdiction: c.jurisdiction, agency: c.agency,
    description: c.description, effectiveDate: c.effectiveDate ? new Date(c.effectiveDate) : null,
    impactLevel: c.impactLevel, impactAreas: c.impactAreas, status: c.status,
    source: c.source, reference: c.reference, impactAssessment: c.impactAssessment,
    assessedBy: c.assessedBy, assessedAt: c.assessedAt ? new Date(c.assessedAt) : null,
    implementationPlan: c.implementationPlan,
    implementedBy: c.implementedBy, implementedAt: c.implementedAt ? new Date(c.implementedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRequirement(row: MemoryRow): RegulatoryRequirement {
  const c = parseRequirement(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, description: c.description, jurisdiction: c.jurisdiction, agency: c.agency,
    category: c.category, frequency: c.frequency, owner: c.owner, status: c.status,
    lastAssessed: c.lastAssessed ? new Date(c.lastAssessed) : null,
    nextAssessment: c.nextAssessment ? new Date(c.nextAssessment) : null,
    evidence: c.evidence, references: c.references, assessment: c.assessment,
    assessedBy: c.assessedBy, assessedAt: c.assessedAt ? new Date(c.assessedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSubmission(row: MemoryRow): RegulatorySubmission {
  const c = parseSubmission(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    filingId: c.filingId, title: c.title, type: c.type, recipient: c.recipient,
    submittedDate: c.submittedDate ? new Date(c.submittedDate) : null,
    status: c.status, content: c.content, attachments: c.attachments,
    response: c.response, responseDate: c.responseDate ? new Date(c.responseDate) : null,
    submittedBy: c.submittedBy,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMonitoring(row: MemoryRow): RegulatoryMonitoring {
  const c = parseMonitoring(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    topic: c.topic, jurisdiction: c.jurisdiction, agency: c.agency, sources: c.sources,
    frequency: c.frequency, status: c.status,
    lastChecked: c.lastChecked ? new Date(c.lastChecked) : null,
    findings: c.findings.map((f) => ({
      date: f.date ? new Date(f.date) : row.createdAt,
      description: f.description, severity: f.severity,
    })),
    assignedTo: c.assignedTo,
    alerts: c.alerts.map((a) => ({
      date: a.date ? new Date(a.date) : row.createdAt,
      message: a.message, level: a.level,
    })),
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Regulatory Service ──

export const RegulatoryService = {
  // ── Filings ──

  async createFiling(
    organizationId: string,
    workspaceId: string,
    input: CreateFilingInput,
    createdBy: string,
  ): Promise<RegulatoryFiling> {
    const content: FilingContent = {
      title: input.title.trim(),
      type: input.type,
      jurisdiction: input.jurisdiction.trim(),
      agency: input.agency.trim(),
      status: input.status ?? 'pending',
      dueDate: input.dueDate ?? null,
      submittedDate: input.submittedDate ?? null,
      acceptedDate: input.acceptedDate ?? null,
      description: input.description ?? '',
      attachments: input.attachments ?? [],
      requirements: input.requirements ?? [],
      fees: input.fees ?? '',
      notes: input.notes ?? '',
      submittedBy: null,
      acceptedBy: null,
      rejectedBy: null,
      rejectionReason: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'reg_filing',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['reg_filing', content.type, content.status]),
        createdBy,
      },
    });

    return toFiling(row as MemoryRow);
  },

  async getFiling(id: string): Promise<RegulatoryFiling | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'reg_filing') return null;
    return toFiling(row as MemoryRow);
  },

  async listFilings(organizationId: string, opts: ListFilingsOpts = {}): Promise<RegulatoryFiling[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'reg_filing', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toFiling(r as MemoryRow));
    if (opts.type) records = records.filter((f) => f.type === opts.type);
    if (opts.status) records = records.filter((f) => f.status === opts.status);
    if (opts.jurisdiction) records = records.filter((f) => f.jurisdiction === opts.jurisdiction);
    if (opts.agency) records = records.filter((f) => f.agency === opts.agency);
    return records;
  },

  async updateFiling(id: string, input: UpdateFilingInput): Promise<RegulatoryFiling | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFiling(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.jurisdiction !== undefined) content.jurisdiction = input.jurisdiction;
    if (input.agency !== undefined) content.agency = input.agency;
    if (input.status !== undefined) content.status = input.status;
    if (input.dueDate !== undefined) content.dueDate = input.dueDate;
    if (input.submittedDate !== undefined) content.submittedDate = input.submittedDate;
    if (input.acceptedDate !== undefined) content.acceptedDate = input.acceptedDate;
    if (input.description !== undefined) content.description = input.description;
    if (input.attachments !== undefined) content.attachments = input.attachments;
    if (input.requirements !== undefined) content.requirements = input.requirements;
    if (input.fees !== undefined) content.fees = input.fees;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_filing', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toFiling(row as MemoryRow);
  },

  async submitFiling(id: string, submittedBy: string): Promise<RegulatoryFiling | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFiling(existing.content);
    content.status = 'submitted';
    content.submittedBy = submittedBy;
    content.submittedDate = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_filing', content.type, 'submitted']),
        },
      }), null,
    );
    if (!row) return null;
    return toFiling(row as MemoryRow);
  },

  async acceptFiling(id: string, acceptedBy: string, acceptanceDate?: string): Promise<RegulatoryFiling | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFiling(existing.content);
    content.status = 'accepted';
    content.acceptedBy = acceptedBy;
    content.acceptedDate = acceptanceDate ?? new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_filing', content.type, 'accepted']),
        },
      }), null,
    );
    if (!row) return null;
    return toFiling(row as MemoryRow);
  },

  async rejectFiling(id: string, reason: string, rejectedBy: string): Promise<RegulatoryFiling | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFiling(existing.content);
    content.status = 'rejected';
    content.rejectedBy = rejectedBy;
    content.rejectionReason = reason;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_filing', content.type, 'rejected']),
        },
      }), null,
    );
    if (!row) return null;
    return toFiling(row as MemoryRow);
  },

  // ── Changes ──

  async createChange(
    organizationId: string,
    workspaceId: string,
    input: CreateChangeInput,
    createdBy: string,
  ): Promise<RegulatoryChange> {
    const content: ChangeContent = {
      title: input.title.trim(),
      type: input.type,
      jurisdiction: input.jurisdiction.trim(),
      agency: input.agency.trim(),
      description: input.description ?? '',
      effectiveDate: input.effectiveDate ?? null,
      impactLevel: input.impactLevel,
      impactAreas: input.impactAreas ?? [],
      status: input.status ?? 'monitoring',
      source: input.source ?? '',
      reference: input.reference ?? '',
      impactAssessment: '',
      assessedBy: null,
      assessedAt: null,
      implementationPlan: '',
      implementedBy: null,
      implementedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'reg_change',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['reg_change', content.type, content.status]),
        createdBy,
      },
    });

    return toChange(row as MemoryRow);
  },

  async getChange(id: string): Promise<RegulatoryChange | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'reg_change') return null;
    return toChange(row as MemoryRow);
  },

  async listChanges(organizationId: string, opts: ListChangesOpts = {}): Promise<RegulatoryChange[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'reg_change', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toChange(r as MemoryRow));
    if (opts.type) records = records.filter((c) => c.type === opts.type);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    if (opts.jurisdiction) records = records.filter((c) => c.jurisdiction === opts.jurisdiction);
    if (opts.impactLevel) records = records.filter((c) => c.impactLevel === opts.impactLevel);
    return records;
  },

  async updateChange(id: string, input: UpdateChangeInput): Promise<RegulatoryChange | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseChange(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.jurisdiction !== undefined) content.jurisdiction = input.jurisdiction;
    if (input.agency !== undefined) content.agency = input.agency;
    if (input.description !== undefined) content.description = input.description;
    if (input.effectiveDate !== undefined) content.effectiveDate = input.effectiveDate;
    if (input.impactLevel !== undefined) content.impactLevel = input.impactLevel;
    if (input.impactAreas !== undefined) content.impactAreas = input.impactAreas;
    if (input.status !== undefined) content.status = input.status;
    if (input.source !== undefined) content.source = input.source;
    if (input.reference !== undefined) content.reference = input.reference;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_change', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toChange(row as MemoryRow);
  },

  async assessImpact(id: string, impactAssessment: string, assessedBy: string): Promise<RegulatoryChange | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseChange(existing.content);
    content.impactAssessment = impactAssessment;
    content.assessedBy = assessedBy;
    content.assessedAt = new Date().toISOString();
    content.status = 'assessed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_change', content.type, 'assessed']),
        },
      }), null,
    );
    if (!row) return null;
    return toChange(row as MemoryRow);
  },

  async implementChange(id: string, implementationPlan: string, implementedBy: string): Promise<RegulatoryChange | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseChange(existing.content);
    content.implementationPlan = implementationPlan;
    content.implementedBy = implementedBy;
    content.implementedAt = new Date().toISOString();
    content.status = 'implemented';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_change', content.type, 'implemented']),
        },
      }), null,
    );
    if (!row) return null;
    return toChange(row as MemoryRow);
  },

  // ── Requirements ──

  async createRequirement(
    organizationId: string,
    workspaceId: string,
    input: CreateRequirementInput,
    createdBy: string,
  ): Promise<RegulatoryRequirement> {
    const content: RequirementContent = {
      title: input.title.trim(),
      description: input.description ?? '',
      jurisdiction: input.jurisdiction.trim(),
      agency: input.agency.trim(),
      category: input.category ?? '',
      frequency: input.frequency ?? '',
      owner: input.owner ?? '',
      status: input.status ?? 'active',
      lastAssessed: input.lastAssessed ?? null,
      nextAssessment: input.nextAssessment ?? null,
      evidence: input.evidence ?? [],
      references: input.references ?? [],
      assessment: '',
      assessedBy: null,
      assessedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'reg_requirement',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['reg_requirement', content.status, content.category]),
        createdBy,
      },
    });

    return toRequirement(row as MemoryRow);
  },

  async getRequirement(id: string): Promise<RegulatoryRequirement | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'reg_requirement') return null;
    return toRequirement(row as MemoryRow);
  },

  async listRequirements(organizationId: string, opts: ListRequirementsOpts = {}): Promise<RegulatoryRequirement[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'reg_requirement', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toRequirement(r as MemoryRow));
    if (opts.jurisdiction) records = records.filter((r) => r.jurisdiction === opts.jurisdiction);
    if (opts.category) records = records.filter((r) => r.category === opts.category);
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    if (opts.owner) records = records.filter((r) => r.owner === opts.owner);
    return records;
  },

  async updateRequirement(id: string, input: UpdateRequirementInput): Promise<RegulatoryRequirement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseRequirement(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.jurisdiction !== undefined) content.jurisdiction = input.jurisdiction;
    if (input.agency !== undefined) content.agency = input.agency;
    if (input.category !== undefined) content.category = input.category;
    if (input.frequency !== undefined) content.frequency = input.frequency;
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.status !== undefined) content.status = input.status;
    if (input.lastAssessed !== undefined) content.lastAssessed = input.lastAssessed;
    if (input.nextAssessment !== undefined) content.nextAssessment = input.nextAssessment;
    if (input.evidence !== undefined) content.evidence = input.evidence;
    if (input.references !== undefined) content.references = input.references;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_requirement', content.status, content.category]),
        },
      }), null,
    );
    if (!row) return null;
    return toRequirement(row as MemoryRow);
  },

  async deleteRequirement(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async assessRequirement(id: string, assessment: string, assessedBy: string): Promise<RegulatoryRequirement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseRequirement(existing.content);
    content.assessment = assessment;
    content.assessedBy = assessedBy;
    content.assessedAt = new Date().toISOString();
    content.lastAssessed = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_requirement', content.status, content.category]),
        },
      }), null,
    );
    if (!row) return null;
    return toRequirement(row as MemoryRow);
  },

  // ── Submissions ──

  async createSubmission(
    organizationId: string,
    workspaceId: string,
    input: CreateSubmissionInput,
    createdBy: string,
  ): Promise<RegulatorySubmission> {
    const content: SubmissionContent = {
      filingId: input.filingId ?? null,
      title: input.title.trim(),
      type: input.type,
      recipient: input.recipient.trim(),
      submittedDate: input.submittedDate ?? null,
      status: input.status ?? 'draft',
      content: input.content ?? '',
      attachments: input.attachments ?? [],
      response: input.response ?? '',
      responseDate: input.responseDate ?? null,
      submittedBy: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'reg_submission',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.filingId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['reg_submission', content.status]),
        createdBy,
      },
    });

    return toSubmission(row as MemoryRow);
  },

  async getSubmission(id: string): Promise<RegulatorySubmission | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'reg_submission') return null;
    return toSubmission(row as MemoryRow);
  },

  async listSubmissions(organizationId: string, opts: ListSubmissionsOpts = {}): Promise<RegulatorySubmission[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'reg_submission', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toSubmission(r as MemoryRow));
    if (opts.filingId) records = records.filter((s) => s.filingId === opts.filingId);
    if (opts.status) records = records.filter((s) => s.status === opts.status);
    if (opts.type) records = records.filter((s) => s.type === opts.type);
    return records;
  },

  async updateSubmission(id: string, input: UpdateSubmissionInput): Promise<RegulatorySubmission | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseSubmission(existing.content);
    if (input.filingId !== undefined) content.filingId = input.filingId;
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.recipient !== undefined) content.recipient = input.recipient;
    if (input.submittedDate !== undefined) content.submittedDate = input.submittedDate;
    if (input.status !== undefined) content.status = input.status;
    if (input.content !== undefined) content.content = input.content;
    if (input.attachments !== undefined) content.attachments = input.attachments;
    if (input.response !== undefined) content.response = input.response;
    if (input.responseDate !== undefined) content.responseDate = input.responseDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_submission', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toSubmission(row as MemoryRow);
  },

  async submitRegulatoryDocument(id: string, submittedBy: string): Promise<RegulatorySubmission | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseSubmission(existing.content);
    content.status = 'submitted';
    content.submittedBy = submittedBy;
    content.submittedDate = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_submission', 'submitted']),
        },
      }), null,
    );
    if (!row) return null;
    return toSubmission(row as MemoryRow);
  },

  async logResponse(id: string, response: string, responseDate: string): Promise<RegulatorySubmission | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseSubmission(existing.content);
    content.response = response;
    content.responseDate = responseDate;
    content.status = 'responded';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_submission', 'responded']),
        },
      }), null,
    );
    if (!row) return null;
    return toSubmission(row as MemoryRow);
  },

  // ── Monitoring ──

  async createMonitoring(
    organizationId: string,
    workspaceId: string,
    input: CreateMonitoringInput,
    createdBy: string,
  ): Promise<RegulatoryMonitoring> {
    const content: MonitoringContent = {
      topic: input.topic.trim(),
      jurisdiction: input.jurisdiction.trim(),
      agency: input.agency ?? '',
      sources: input.sources ?? [],
      frequency: input.frequency,
      status: input.status ?? 'active',
      lastChecked: input.lastChecked ?? null,
      findings: input.findings ?? [],
      assignedTo: input.assignedTo ?? '',
      alerts: input.alerts ?? [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'reg_monitoring',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['reg_monitoring', content.status, content.frequency]),
        createdBy,
      },
    });

    return toMonitoring(row as MemoryRow);
  },

  async getMonitoring(id: string): Promise<RegulatoryMonitoring | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'reg_monitoring') return null;
    return toMonitoring(row as MemoryRow);
  },

  async listMonitoring(organizationId: string, opts: ListMonitoringOpts = {}): Promise<RegulatoryMonitoring[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'reg_monitoring', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toMonitoring(r as MemoryRow));
    if (opts.jurisdiction) records = records.filter((m) => m.jurisdiction === opts.jurisdiction);
    if (opts.status) records = records.filter((m) => m.status === opts.status);
    if (opts.frequency) records = records.filter((m) => m.frequency === opts.frequency);
    return records;
  },

  async updateMonitoring(id: string, input: UpdateMonitoringInput): Promise<RegulatoryMonitoring | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMonitoring(existing.content);
    if (input.topic !== undefined) content.topic = input.topic.trim();
    if (input.jurisdiction !== undefined) content.jurisdiction = input.jurisdiction;
    if (input.agency !== undefined) content.agency = input.agency;
    if (input.sources !== undefined) content.sources = input.sources;
    if (input.frequency !== undefined) content.frequency = input.frequency;
    if (input.status !== undefined) content.status = input.status;
    if (input.lastChecked !== undefined) content.lastChecked = input.lastChecked;
    if (input.findings !== undefined) content.findings = input.findings;
    if (input.assignedTo !== undefined) content.assignedTo = input.assignedTo;
    if (input.alerts !== undefined) content.alerts = input.alerts;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_monitoring', content.status, content.frequency]),
        },
      }), null,
    );
    if (!row) return null;
    return toMonitoring(row as MemoryRow);
  },

  async deleteMonitoring(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async recordFinding(id: string, finding: { description: string; severity: string }, recordedBy: string): Promise<RegulatoryMonitoring | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMonitoring(existing.content);
    content.findings.push({
      date: new Date().toISOString(),
      description: finding.description,
      severity: finding.severity,
    });
    content.lastChecked = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['reg_monitoring', content.status, content.frequency]),
        },
      }), null,
    );
    if (!row) return null;
    return toMonitoring(row as MemoryRow);
  },

  // ── Metrics ──

  async getRegulatoryMetrics(organizationId: string): Promise<RegulatoryMetrics> {
    const [filings, changes, requirements, submissions, monitoring] = await Promise.all([
      RegulatoryService.listFilings(organizationId),
      RegulatoryService.listChanges(organizationId),
      RegulatoryService.listRequirements(organizationId),
      RegulatoryService.listSubmissions(organizationId),
      RegulatoryService.listMonitoring(organizationId),
    ]);

    const pendingFilings = filings.filter((f) => f.status === 'pending').length;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = filings.filter(
      (f) => f.dueDate && f.dueDate <= thirtyDaysFromNow && f.status !== 'accepted' && f.status !== 'rejected',
    ).length;
    const highImpactChanges = changes.filter(
      (c) => (c.impactLevel === 'high' || c.impactLevel === 'critical') && c.status !== 'implemented' && c.status !== 'archived',
    ).length;
    const activeRequirements = requirements.filter((r) => r.status === 'active').length;
    const compliantRequirements = requirements.filter((r) => r.status === 'compliant').length;
    const totalAssessed = requirements.filter((r) => r.status === 'compliant' || r.status === 'non_compliant').length;
    const complianceRate = totalAssessed > 0 ? Math.round((compliantRequirements / totalAssessed) * 100) : 0;
    const monitoringCoverage = monitoring.filter((m) => m.status === 'active').length;
    const openSubmissions = submissions.filter((s) => s.status === 'draft' || s.status === 'submitted').length;

    return {
      pendingFilings,
      upcomingDeadlines,
      highImpactChanges,
      complianceRate,
      monitoringCoverage,
      activeRequirements,
      openSubmissions,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<RegulatoryStats> {
    const [filings, changes, requirements, submissions, monitoring] = await Promise.all([
      RegulatoryService.listFilings(organizationId),
      RegulatoryService.listChanges(organizationId),
      RegulatoryService.listRequirements(organizationId),
      RegulatoryService.listSubmissions(organizationId),
      RegulatoryService.listMonitoring(organizationId),
    ]);

    const byFilingStatus: Record<string, number> = {};
    for (const f of filings) byFilingStatus[f.status] = (byFilingStatus[f.status] || 0) + 1;

    const byChangeStatus: Record<string, number> = {};
    for (const c of changes) byChangeStatus[c.status] = (byChangeStatus[c.status] || 0) + 1;

    const byRequirementStatus: Record<string, number> = {};
    for (const r of requirements) byRequirementStatus[r.status] = (byRequirementStatus[r.status] || 0) + 1;

    return {
      filingCount: filings.length,
      changeCount: changes.length,
      requirementCount: requirements.length,
      submissionCount: submissions.length,
      monitoringCount: monitoring.length,
      pendingFilingCount: filings.filter((f) => f.status === 'pending').length,
      acceptedFilingCount: filings.filter((f) => f.status === 'accepted').length,
      rejectedFilingCount: filings.filter((f) => f.status === 'rejected').length,
      highImpactChangeCount: changes.filter((c) => c.impactLevel === 'high' || c.impactLevel === 'critical').length,
      activeRequirementCount: requirements.filter((r) => r.status === 'active').length,
      activeMonitoringCount: monitoring.filter((m) => m.status === 'active').length,
      byFilingStatus,
      byChangeStatus,
      byRequirementStatus,
    };
  },
};
