import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type CrisisType = 'natural_disaster' | 'cyber_attack' | 'data_breach' | 'public_relations' | 'financial' | 'operational' | 'legal' | 'health_safety' | 'supply_chain' | 'reputation' | 'security_breach' | 'other';
export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PlanStatus = 'draft' | 'approved' | 'active' | 'under_review' | 'archived';
export type IncidentStatus = 'reported' | 'assessed' | 'in_progress' | 'contained' | 'resolved' | 'closed';
export type ContactRole = 'crisis_manager' | 'spokesperson' | 'legal_counsel' | 'it_lead' | 'hr_lead' | 'facilities_lead' | 'security_lead' | 'external_pr' | 'executive_sponsor' | 'other';
export type ContactStatus = 'available' | 'unavailable' | 'standby';
export type DrillStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type DrillType = 'tabletop' | 'functional' | 'full_scale' | 'simulation';

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

interface CrisisPlanContent {
  name: string;
  crisisType: CrisisType;
  description: string;
  severityThreshold: CrisisSeverity;
  responseSteps: string;
  escalationMatrix: string;
  communicationProtocol: string;
  resourceList: string;
  recoverySteps: string;
  status: PlanStatus;
  approvedBy: string;
  approvedDate: string;
  version: string;
  lastReviewed: string;
}

interface CrisisIncidentContent {
  title: string;
  crisisType: CrisisType;
  severity: CrisisSeverity;
  description: string;
  reportedBy: string;
  reportedDate: string;
  affectedSystems: string;
  affectedDepartments: string;
  impactAssessment: string;
  status: IncidentStatus;
  planId: string;
  estimatedCost: number;
  estimatedDowntime: string;
  resolution: string;
  resolvedBy: string;
  resolvedAt: string;
}

interface CrisisContactContent {
  name: string;
  role: ContactRole;
  department: string;
  phone: string;
  email: string;
  alternatePhone: string;
  status: ContactStatus;
  notes: string;
}

interface CrisisDrillContent {
  planId: string;
  name: string;
  type: DrillType;
  scheduledDate: string;
  duration: number;
  participants: string;
  objectives: string;
  status: DrillStatus;
  results: string;
  notes: string;
}

// ── Public interfaces ──

export interface CrisisPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  crisisType: CrisisType;
  description: string;
  severityThreshold: CrisisSeverity;
  responseSteps: string;
  escalationMatrix: string;
  communicationProtocol: string;
  resourceList: string;
  recoverySteps: string;
  status: PlanStatus;
  approvedBy: string;
  approvedDate: Date | null;
  version: string;
  lastReviewed: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisIncident {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  crisisType: CrisisType;
  severity: CrisisSeverity;
  description: string;
  reportedBy: string;
  reportedDate: Date;
  affectedSystems: string;
  affectedDepartments: string;
  impactAssessment: string;
  status: IncidentStatus;
  planId: string;
  estimatedCost: number;
  estimatedDowntime: string;
  resolution: string;
  resolvedBy: string;
  resolvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisContact {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  role: ContactRole;
  department: string;
  phone: string;
  email: string;
  alternatePhone: string;
  status: ContactStatus;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisDrill {
  id: string;
  organizationId: string;
  workspaceId: string;
  planId: string;
  name: string;
  type: DrillType;
  scheduledDate: Date;
  duration: number;
  participants: string;
  objectives: string;
  status: DrillStatus;
  results: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisMetrics {
  activeIncidents: number;
  plansCoverage: number;
  drillReadiness: number;
  responseTime: number;
}

export interface CrisisStats {
  planCount: number;
  approvedPlanCount: number;
  incidentCount: number;
  activeIncidentCount: number;
  contactCount: number;
  availableContactCount: number;
  drillCount: number;
  completedDrillCount: number;
  byCrisisType: Record<string, number>;
  bySeverity: Record<string, number>;
  byIncidentStatus: Record<string, number>;
  byPlanStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePlanInput {
  name: string;
  crisisType: CrisisType;
  description?: string;
  severityThreshold?: CrisisSeverity;
  responseSteps?: string;
  escalationMatrix?: string;
  communicationProtocol?: string;
  resourceList?: string;
  recoverySteps?: string;
  status?: PlanStatus;
  approvedBy?: string;
  approvedDate?: string;
  version?: string;
  lastReviewed?: string;
}

export interface UpdatePlanInput {
  name?: string;
  crisisType?: CrisisType;
  description?: string;
  severityThreshold?: CrisisSeverity;
  responseSteps?: string;
  escalationMatrix?: string;
  communicationProtocol?: string;
  resourceList?: string;
  recoverySteps?: string;
  status?: PlanStatus;
  approvedBy?: string;
  approvedDate?: string;
  version?: string;
  lastReviewed?: string;
}

export interface ListPlansOpts {
  crisisType?: CrisisType;
  status?: PlanStatus;
}

export interface CreateIncidentInput {
  title: string;
  crisisType: CrisisType;
  severity: CrisisSeverity;
  description?: string;
  reportedBy: string;
  reportedDate?: string;
  affectedSystems?: string;
  affectedDepartments?: string;
  impactAssessment?: string;
  status?: IncidentStatus;
  planId?: string;
  estimatedCost?: number;
  estimatedDowntime?: string;
}

export interface UpdateIncidentInput {
  title?: string;
  crisisType?: CrisisType;
  severity?: CrisisSeverity;
  description?: string;
  affectedSystems?: string;
  affectedDepartments?: string;
  impactAssessment?: string;
  status?: IncidentStatus;
  planId?: string;
  estimatedCost?: number;
  estimatedDowntime?: string;
}

export interface ListIncidentsOpts {
  crisisType?: CrisisType;
  severity?: CrisisSeverity;
  status?: IncidentStatus;
}

export interface CreateContactInput {
  name: string;
  role: ContactRole;
  department?: string;
  phone?: string;
  email?: string;
  alternatePhone?: string;
  status?: ContactStatus;
  notes?: string;
}

export interface UpdateContactInput {
  name?: string;
  role?: ContactRole;
  department?: string;
  phone?: string;
  email?: string;
  alternatePhone?: string;
  status?: ContactStatus;
  notes?: string;
}

export interface ListContactsOpts {
  role?: ContactRole;
  status?: ContactStatus;
}

export interface CreateDrillInput {
  planId?: string;
  name: string;
  type: DrillType;
  scheduledDate: string;
  duration?: number;
  participants?: string;
  objectives?: string;
  status?: DrillStatus;
  notes?: string;
}

export interface UpdateDrillInput {
  planId?: string;
  name?: string;
  type?: DrillType;
  scheduledDate?: string;
  duration?: number;
  participants?: string;
  objectives?: string;
  status?: DrillStatus;
  notes?: string;
}

export interface ListDrillsOpts {
  type?: DrillType;
  status?: DrillStatus;
  planId?: string;
}

// ── Helpers ──

const fallbackPlan: CrisisPlanContent = {
  name: '', crisisType: 'other', description: '', severityThreshold: 'medium',
  responseSteps: '', escalationMatrix: '', communicationProtocol: '', resourceList: '',
  recoverySteps: '', status: 'draft', approvedBy: '', approvedDate: '', version: '1.0', lastReviewed: '',
};

const fallbackIncident: CrisisIncidentContent = {
  title: '', crisisType: 'other', severity: 'medium', description: '', reportedBy: '',
  reportedDate: '', affectedSystems: '', affectedDepartments: '', impactAssessment: '',
  status: 'reported', planId: '', estimatedCost: 0, estimatedDowntime: '', resolution: '',
  resolvedBy: '', resolvedAt: '',
};

const fallbackContact: CrisisContactContent = {
  name: '', role: 'other', department: '', phone: '', email: '', alternatePhone: '',
  status: 'available', notes: '',
};

const fallbackDrill: CrisisDrillContent = {
  planId: '', name: '', type: 'tabletop', scheduledDate: '', duration: 0,
  participants: '', objectives: '', status: 'scheduled', results: '', notes: '',
};

function parsePlan(raw: string): CrisisPlanContent {
  if (!raw) return fallbackPlan;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      crisisType: (p.crisisType as CrisisType) ?? 'other',
      description: p.description ?? '',
      severityThreshold: (p.severityThreshold as CrisisSeverity) ?? 'medium',
      responseSteps: p.responseSteps ?? '',
      escalationMatrix: p.escalationMatrix ?? '',
      communicationProtocol: p.communicationProtocol ?? '',
      resourceList: p.resourceList ?? '',
      recoverySteps: p.recoverySteps ?? '',
      status: (p.status as PlanStatus) ?? 'draft',
      approvedBy: p.approvedBy ?? '',
      approvedDate: p.approvedDate ?? '',
      version: p.version ?? '1.0',
      lastReviewed: p.lastReviewed ?? '',
    };
  } catch { return fallbackPlan; }
}

function parseIncident(raw: string): CrisisIncidentContent {
  if (!raw) return fallbackIncident;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      crisisType: (p.crisisType as CrisisType) ?? 'other',
      severity: (p.severity as CrisisSeverity) ?? 'medium',
      description: p.description ?? '',
      reportedBy: p.reportedBy ?? '',
      reportedDate: p.reportedDate ?? '',
      affectedSystems: p.affectedSystems ?? '',
      affectedDepartments: p.affectedDepartments ?? '',
      impactAssessment: p.impactAssessment ?? '',
      status: (p.status as IncidentStatus) ?? 'reported',
      planId: p.planId ?? '',
      estimatedCost: p.estimatedCost ?? 0,
      estimatedDowntime: p.estimatedDowntime ?? '',
      resolution: p.resolution ?? '',
      resolvedBy: p.resolvedBy ?? '',
      resolvedAt: p.resolvedAt ?? '',
    };
  } catch { return fallbackIncident; }
}

function parseContact(raw: string): CrisisContactContent {
  if (!raw) return fallbackContact;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      role: (p.role as ContactRole) ?? 'other',
      department: p.department ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      alternatePhone: p.alternatePhone ?? '',
      status: (p.status as ContactStatus) ?? 'available',
      notes: p.notes ?? '',
    };
  } catch { return fallbackContact; }
}

function parseDrill(raw: string): CrisisDrillContent {
  if (!raw) return fallbackDrill;
  try {
    const p = JSON.parse(raw);
    return {
      planId: p.planId ?? '',
      name: p.name ?? '',
      type: (p.type as DrillType) ?? 'tabletop',
      scheduledDate: p.scheduledDate ?? '',
      duration: p.duration ?? 0,
      participants: p.participants ?? '',
      objectives: p.objectives ?? '',
      status: (p.status as DrillStatus) ?? 'scheduled',
      results: p.results ?? '',
      notes: p.notes ?? '',
    };
  } catch { return fallbackDrill; }
}

function toPlan(row: MemoryRow): CrisisPlan {
  const c = parsePlan(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, crisisType: c.crisisType, description: c.description,
    severityThreshold: c.severityThreshold, responseSteps: c.responseSteps,
    escalationMatrix: c.escalationMatrix, communicationProtocol: c.communicationProtocol,
    resourceList: c.resourceList, recoverySteps: c.recoverySteps, status: c.status,
    approvedBy: c.approvedBy,
    approvedDate: c.approvedDate ? new Date(c.approvedDate) : null,
    version: c.version,
    lastReviewed: c.lastReviewed ? new Date(c.lastReviewed) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toIncident(row: MemoryRow): CrisisIncident {
  const c = parseIncident(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, crisisType: c.crisisType, severity: c.severity, description: c.description,
    reportedBy: c.reportedBy,
    reportedDate: c.reportedDate ? new Date(c.reportedDate) : row.createdAt,
    affectedSystems: c.affectedSystems, affectedDepartments: c.affectedDepartments,
    impactAssessment: c.impactAssessment, status: c.status, planId: c.planId,
    estimatedCost: c.estimatedCost, estimatedDowntime: c.estimatedDowntime,
    resolution: c.resolution, resolvedBy: c.resolvedBy,
    resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toContact(row: MemoryRow): CrisisContact {
  const c = parseContact(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, role: c.role, department: c.department, phone: c.phone,
    email: c.email, alternatePhone: c.alternatePhone, status: c.status, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDrill(row: MemoryRow): CrisisDrill {
  const c = parseDrill(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    planId: c.planId, name: c.name, type: c.type,
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate) : row.createdAt,
    duration: c.duration, participants: c.participants, objectives: c.objectives,
    status: c.status, results: c.results, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Crisis Service ──

export const CrisisService = {
  // ── Plans ──

  async createPlan(
    organizationId: string,
    workspaceId: string,
    input: CreatePlanInput,
    createdBy: string,
  ): Promise<CrisisPlan> {
    const content: CrisisPlanContent = {
      name: input.name.trim(),
      crisisType: input.crisisType,
      description: input.description ?? '',
      severityThreshold: input.severityThreshold ?? 'medium',
      responseSteps: input.responseSteps ?? '',
      escalationMatrix: input.escalationMatrix ?? '',
      communicationProtocol: input.communicationProtocol ?? '',
      resourceList: input.resourceList ?? '',
      recoverySteps: input.recoverySteps ?? '',
      status: input.status ?? 'draft',
      approvedBy: input.approvedBy ?? '',
      approvedDate: input.approvedDate ?? '',
      version: input.version ?? '1.0',
      lastReviewed: input.lastReviewed ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'crisis_plan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['crisis_plan', content.crisisType, content.status]),
        createdBy,
      },
    });

    return toPlan(row as MemoryRow);
  },

  async getPlan(id: string): Promise<CrisisPlan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'crisis_plan') return null;
    return toPlan(row as MemoryRow);
  },

  async listPlans(organizationId: string, opts: ListPlansOpts = {}): Promise<CrisisPlan[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'crisis_plan', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toPlan(r as MemoryRow));
    if (opts.crisisType) records = records.filter((p) => p.crisisType === opts.crisisType);
    if (opts.status) records = records.filter((p) => p.status === opts.status);
    return records;
  },

  async updatePlan(id: string, input: UpdatePlanInput): Promise<CrisisPlan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parsePlan(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.crisisType !== undefined) content.crisisType = input.crisisType;
    if (input.description !== undefined) content.description = input.description;
    if (input.severityThreshold !== undefined) content.severityThreshold = input.severityThreshold;
    if (input.responseSteps !== undefined) content.responseSteps = input.responseSteps;
    if (input.escalationMatrix !== undefined) content.escalationMatrix = input.escalationMatrix;
    if (input.communicationProtocol !== undefined) content.communicationProtocol = input.communicationProtocol;
    if (input.resourceList !== undefined) content.resourceList = input.resourceList;
    if (input.recoverySteps !== undefined) content.recoverySteps = input.recoverySteps;
    if (input.status !== undefined) content.status = input.status;
    if (input.approvedBy !== undefined) content.approvedBy = input.approvedBy;
    if (input.approvedDate !== undefined) content.approvedDate = input.approvedDate;
    if (input.version !== undefined) content.version = input.version;
    if (input.lastReviewed !== undefined) content.lastReviewed = input.lastReviewed;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['crisis_plan', content.crisisType, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toPlan(row as MemoryRow);
  },

  async deletePlan(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async approvePlan(id: string, approvedBy: string): Promise<CrisisPlan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parsePlan(existing.content);
    content.status = 'approved';
    content.approvedBy = approvedBy;
    content.approvedDate = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['crisis_plan', content.crisisType, 'approved']),
          verifiedBy: approvedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toPlan(row as MemoryRow);
  },

  async reviewPlan(id: string, reviewedBy: string): Promise<CrisisPlan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parsePlan(existing.content);
    content.lastReviewed = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['crisis_plan', content.crisisType, content.status]),
          verifiedBy: reviewedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toPlan(row as MemoryRow);
  },

  // ── Incidents ──

  async createIncident(
    organizationId: string,
    workspaceId: string,
    input: CreateIncidentInput,
    createdBy: string,
  ): Promise<CrisisIncident> {
    const content: CrisisIncidentContent = {
      title: input.title.trim(),
      crisisType: input.crisisType,
      severity: input.severity,
      description: input.description ?? '',
      reportedBy: input.reportedBy,
      reportedDate: input.reportedDate ?? new Date().toISOString(),
      affectedSystems: input.affectedSystems ?? '',
      affectedDepartments: input.affectedDepartments ?? '',
      impactAssessment: input.impactAssessment ?? '',
      status: input.status ?? 'reported',
      planId: input.planId ?? '',
      estimatedCost: input.estimatedCost ?? 0,
      estimatedDowntime: input.estimatedDowntime ?? '',
      resolution: '',
      resolvedBy: '',
      resolvedAt: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'crisis_incident',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['crisis_incident', content.crisisType, content.severity, content.status]),
        createdBy,
      },
    });

    return toIncident(row as MemoryRow);
  },

  async getIncident(id: string): Promise<CrisisIncident | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'crisis_incident') return null;
    return toIncident(row as MemoryRow);
  },

  async listIncidents(organizationId: string, opts: ListIncidentsOpts = {}): Promise<CrisisIncident[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'crisis_incident', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toIncident(r as MemoryRow));
    if (opts.crisisType) records = records.filter((i) => i.crisisType === opts.crisisType);
    if (opts.severity) records = records.filter((i) => i.severity === opts.severity);
    if (opts.status) records = records.filter((i) => i.status === opts.status);
    return records;
  },

  async updateIncident(id: string, input: UpdateIncidentInput): Promise<CrisisIncident | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIncident(existing.content);
    if (input.title !== undefined) content.title = input.title;
    if (input.crisisType !== undefined) content.crisisType = input.crisisType;
    if (input.severity !== undefined) content.severity = input.severity;
    if (input.description !== undefined) content.description = input.description;
    if (input.affectedSystems !== undefined) content.affectedSystems = input.affectedSystems;
    if (input.affectedDepartments !== undefined) content.affectedDepartments = input.affectedDepartments;
    if (input.impactAssessment !== undefined) content.impactAssessment = input.impactAssessment;
    if (input.status !== undefined) content.status = input.status;
    if (input.planId !== undefined) content.planId = input.planId;
    if (input.estimatedCost !== undefined) content.estimatedCost = input.estimatedCost;
    if (input.estimatedDowntime !== undefined) content.estimatedDowntime = input.estimatedDowntime;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['crisis_incident', content.crisisType, content.severity, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toIncident(row as MemoryRow);
  },

  async containIncident(id: string, containedBy: string): Promise<CrisisIncident | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIncident(existing.content);
    content.status = 'contained';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['crisis_incident', content.crisisType, content.severity, 'contained']),
          verifiedBy: containedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toIncident(row as MemoryRow);
  },

  async resolveIncident(id: string, resolution: string, resolvedBy: string): Promise<CrisisIncident | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIncident(existing.content);
    content.status = 'resolved';
    content.resolution = resolution;
    content.resolvedBy = resolvedBy;
    content.resolvedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['crisis_incident', content.crisisType, content.severity, 'resolved']),
          verifiedBy: resolvedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toIncident(row as MemoryRow);
  },

  async closeIncident(id: string, closedBy: string): Promise<CrisisIncident | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIncident(existing.content);
    content.status = 'closed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['crisis_incident', content.crisisType, content.severity, 'closed']),
          verifiedBy: closedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toIncident(row as MemoryRow);
  },

  // ── Contacts ──

  async createContact(
    organizationId: string,
    workspaceId: string,
    input: CreateContactInput,
    createdBy: string,
  ): Promise<CrisisContact> {
    const content: CrisisContactContent = {
      name: input.name.trim(),
      role: input.role,
      department: input.department ?? '',
      phone: input.phone ?? '',
      email: input.email ?? '',
      alternatePhone: input.alternatePhone ?? '',
      status: input.status ?? 'available',
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'crisis_contact',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['crisis_contact', content.role, content.status]),
        createdBy,
      },
    });

    return toContact(row as MemoryRow);
  },

  async getContact(id: string): Promise<CrisisContact | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'crisis_contact') return null;
    return toContact(row as MemoryRow);
  },

  async listContacts(organizationId: string, opts: ListContactsOpts = {}): Promise<CrisisContact[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'crisis_contact', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toContact(r as MemoryRow));
    if (opts.role) records = records.filter((c) => c.role === opts.role);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    return records;
  },

  async updateContact(id: string, input: UpdateContactInput): Promise<CrisisContact | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseContact(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.role !== undefined) content.role = input.role;
    if (input.department !== undefined) content.department = input.department;
    if (input.phone !== undefined) content.phone = input.phone;
    if (input.email !== undefined) content.email = input.email;
    if (input.alternatePhone !== undefined) content.alternatePhone = input.alternatePhone;
    if (input.status !== undefined) content.status = input.status;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['crisis_contact', content.role, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toContact(row as MemoryRow);
  },

  async deleteContact(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Drills ──

  async createDrill(
    organizationId: string,
    workspaceId: string,
    input: CreateDrillInput,
    createdBy: string,
  ): Promise<CrisisDrill> {
    const content: CrisisDrillContent = {
      planId: input.planId ?? '',
      name: input.name.trim(),
      type: input.type,
      scheduledDate: input.scheduledDate,
      duration: input.duration ?? 0,
      participants: input.participants ?? '',
      objectives: input.objectives ?? '',
      status: input.status ?? 'scheduled',
      results: '',
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'crisis_drill',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['crisis_drill', content.type, content.status]),
        createdBy,
      },
    });

    return toDrill(row as MemoryRow);
  },

  async getDrill(id: string): Promise<CrisisDrill | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'crisis_drill') return null;
    return toDrill(row as MemoryRow);
  },

  async listDrills(organizationId: string, opts: ListDrillsOpts = {}): Promise<CrisisDrill[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'crisis_drill', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toDrill(r as MemoryRow));
    if (opts.type) records = records.filter((d) => d.type === opts.type);
    if (opts.status) records = records.filter((d) => d.status === opts.status);
    if (opts.planId) records = records.filter((d) => d.planId === opts.planId);
    return records;
  },

  async updateDrill(id: string, input: UpdateDrillInput): Promise<CrisisDrill | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDrill(existing.content);
    if (input.planId !== undefined) content.planId = input.planId;
    if (input.name !== undefined) content.name = input.name;
    if (input.type !== undefined) content.type = input.type;
    if (input.scheduledDate !== undefined) content.scheduledDate = input.scheduledDate;
    if (input.duration !== undefined) content.duration = input.duration;
    if (input.participants !== undefined) content.participants = input.participants;
    if (input.objectives !== undefined) content.objectives = input.objectives;
    if (input.status !== undefined) content.status = input.status;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['crisis_drill', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toDrill(row as MemoryRow);
  },

  async completeDrill(id: string, results: string, completedBy: string): Promise<CrisisDrill | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDrill(existing.content);
    content.status = 'completed';
    content.results = results;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['crisis_drill', content.type, 'completed']),
          verifiedBy: completedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toDrill(row as MemoryRow);
  },

  async cancelDrill(id: string, reason: string, cancelledBy: string): Promise<CrisisDrill | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDrill(existing.content);
    content.status = 'cancelled';
    content.notes = content.notes
      ? `${content.notes}\n[Cancelled by ${cancelledBy}: ${reason}]`
      : `[Cancelled by ${cancelledBy}: ${reason}]`;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['crisis_drill', content.type, 'cancelled']),
          verifiedBy: cancelledBy,
        },
      }), null,
    );
    if (!row) return null;
    return toDrill(row as MemoryRow);
  },

  // ── Metrics ──

  async getCrisisMetrics(organizationId: string): Promise<CrisisMetrics> {
    const [incidents, plans, drills] = await Promise.all([
      CrisisService.listIncidents(organizationId),
      CrisisService.listPlans(organizationId),
      CrisisService.listDrills(organizationId),
    ]);

    const activeIncidents = incidents.filter(
      (i) => i.status === 'reported' || i.status === 'assessed' || i.status === 'in_progress' || i.status === 'contained',
    ).length;
    const approvedPlans = plans.filter((p) => p.status === 'approved' || p.status === 'active').length;
    const plansCoverage = plans.length > 0 ? Math.round((approvedPlans / plans.length) * 100) : 0;
    const completedDrills = drills.filter((d) => d.status === 'completed').length;
    const drillReadiness = drills.length > 0 ? Math.round((completedDrills / drills.length) * 100) : 0;

    const resolvedIncidents = incidents.filter((i) => i.status === 'resolved' || i.status === 'closed');
    let totalResponseHours = 0;
    for (const inc of resolvedIncidents) {
      if (inc.resolvedAt) {
        const diff = inc.resolvedAt.getTime() - inc.reportedDate.getTime();
        totalResponseHours += diff / (1000 * 60 * 60);
      }
    }
    const responseTime = resolvedIncidents.length > 0 ? Math.round(totalResponseHours / resolvedIncidents.length) : 0;

    return {
      activeIncidents,
      plansCoverage,
      drillReadiness,
      responseTime,
    };
  },

  // ── Stats ──

  async getCrisisStats(organizationId: string): Promise<CrisisStats> {
    const [plans, incidents, contacts, drills] = await Promise.all([
      CrisisService.listPlans(organizationId),
      CrisisService.listIncidents(organizationId),
      CrisisService.listContacts(organizationId),
      CrisisService.listDrills(organizationId),
    ]);

    const byCrisisType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byIncidentStatus: Record<string, number> = {};
    for (const i of incidents) {
      byCrisisType[i.crisisType] = (byCrisisType[i.crisisType] || 0) + 1;
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
      byIncidentStatus[i.status] = (byIncidentStatus[i.status] || 0) + 1;
    }

    const byPlanStatus: Record<string, number> = {};
    for (const p of plans) {
      byPlanStatus[p.status] = (byPlanStatus[p.status] || 0) + 1;
    }

    return {
      planCount: plans.length,
      approvedPlanCount: plans.filter((p) => p.status === 'approved' || p.status === 'active').length,
      incidentCount: incidents.length,
      activeIncidentCount: incidents.filter(
        (i) => i.status === 'reported' || i.status === 'assessed' || i.status === 'in_progress' || i.status === 'contained',
      ).length,
      contactCount: contacts.length,
      availableContactCount: contacts.filter((c) => c.status === 'available').length,
      drillCount: drills.length,
      completedDrillCount: drills.filter((d) => d.status === 'completed').length,
      byCrisisType,
      bySeverity,
      byIncidentStatus,
      byPlanStatus,
    };
  },
};
