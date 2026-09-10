import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type SafetyIncidentType = 'injury' | 'near_miss' | 'property_damage' | 'environmental' | 'fire' | 'spill' | 'equipment_failure' | 'security' | 'fatality' | 'first_aid';
export type SafetyIncidentStatus = 'reported' | 'investigating' | 'resolved' | 'closed' | 'reopened';
export type InvestigationType = 'formal' | 'informal' | 'joint' | 'external' | 'regulatory';
export type InvestigationStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type RCAType = 'five_whys' | 'fishbone' | 'fault_tree' | 'fmea' | 'pareto' | 'scatter' | 'is_is_not';
export type RCAStatus = 'draft' | 'in_progress' | 'completed' | 'reviewed' | 'archived';
export type CorrectiveActionType = 'immediate' | 'corrective' | 'preventive' | 'systemic' | 'behavioral' | 'engineering' | 'administrative';
export type CorrectiveActionStatus = 'planned' | 'in_progress' | 'completed' | 'verified' | 'overdue' | 'cancelled';

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

export interface SafetyIncident {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: SafetyIncidentType;
  description: string;
  status: SafetyIncidentStatus;
  severity: string;
  location: string;
  incidentDate: Date | null;
  reportedBy: string;
  affectedPerson: string;
  department: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentInvestigation {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: InvestigationType;
  description: string;
  status: InvestigationStatus;
  incidentId: string | null;
  investigator: string;
  startDate: Date | null;
  endDate: Date | null;
  findings: string;
  recommendations: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RootCauseAnalysis {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RCAType;
  description: string;
  status: RCAStatus;
  incidentId: string | null;
  analyst: string;
  method: string;
  contributingFactors: string;
  rootCause: string;
  conclusions: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorrectiveAction {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CorrectiveActionType;
  description: string;
  status: CorrectiveActionStatus;
  incidentId: string | null;
  priority: string;
  assignedTo: string;
  dueDate: Date | null;
  completedDate: Date | null;
  verifiedBy: string;
  cost: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyIncidentMetrics {
  reportedIncidents: number;
  activeInvestigations: number;
  completedRCAs: number;
  activeCorrectiveActions: number;
  overdueActions: number;
}

export interface SafetyIncidentStats {
  incidentCount: number;
  investigationCount: number;
  rcaCount: number;
  correctiveActionCount: number;
  byIncidentType: Record<string, number>;
  byIncidentStatus: Record<string, number>;
  byInvestigationType: Record<string, number>;
  byInvestigationStatus: Record<string, number>;
  byRCAType: Record<string, number>;
  byRCAStatus: Record<string, number>;
  byCorrectiveActionType: Record<string, number>;
  byCorrectiveActionStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateSafetyIncidentInput {
  name: string;
  type: SafetyIncidentType;
  description?: string;
  status?: SafetyIncidentStatus;
  severity?: string;
  location?: string;
  incidentDate?: string;
  reportedBy?: string;
  affectedPerson?: string;
  department?: string;
  notes?: string;
}

export interface UpdateSafetyIncidentInput {
  name?: string;
  type?: SafetyIncidentType;
  description?: string;
  status?: SafetyIncidentStatus;
  severity?: string;
  location?: string;
  incidentDate?: string;
  reportedBy?: string;
  affectedPerson?: string;
  department?: string;
  notes?: string;
}

export interface ListSafetyIncidentsOpts {
  type?: SafetyIncidentType;
  status?: SafetyIncidentStatus;
}

export interface CreateIncidentInvestigationInput {
  name: string;
  type: InvestigationType;
  description?: string;
  status?: InvestigationStatus;
  incidentId?: string;
  investigator?: string;
  startDate?: string;
  endDate?: string;
  findings?: string;
  recommendations?: string;
  notes?: string;
}

export interface UpdateIncidentInvestigationInput {
  name?: string;
  type?: InvestigationType;
  description?: string;
  status?: InvestigationStatus;
  incidentId?: string;
  investigator?: string;
  startDate?: string;
  endDate?: string;
  findings?: string;
  recommendations?: string;
  notes?: string;
}

export interface ListIncidentInvestigationsOpts {
  incidentId?: string;
  type?: InvestigationType;
  status?: InvestigationStatus;
}

export interface CreateRootCauseAnalysisInput {
  name: string;
  type: RCAType;
  description?: string;
  status?: RCAStatus;
  incidentId?: string;
  analyst?: string;
  method?: string;
  contributingFactors?: string;
  rootCause?: string;
  conclusions?: string;
  notes?: string;
}

export interface UpdateRootCauseAnalysisInput {
  name?: string;
  type?: RCAType;
  description?: string;
  status?: RCAStatus;
  incidentId?: string;
  analyst?: string;
  method?: string;
  contributingFactors?: string;
  rootCause?: string;
  conclusions?: string;
  notes?: string;
}

export interface ListRootCauseAnalysesOpts {
  incidentId?: string;
  type?: RCAType;
  status?: RCAStatus;
}

export interface CreateCorrectiveActionInput {
  name: string;
  type: CorrectiveActionType;
  description?: string;
  status?: CorrectiveActionStatus;
  incidentId?: string;
  priority?: string;
  assignedTo?: string;
  dueDate?: string;
  completedDate?: string;
  verifiedBy?: string;
  cost?: number;
  notes?: string;
}

export interface UpdateCorrectiveActionInput {
  name?: string;
  type?: CorrectiveActionType;
  description?: string;
  status?: CorrectiveActionStatus;
  incidentId?: string;
  priority?: string;
  assignedTo?: string;
  dueDate?: string;
  completedDate?: string;
  verifiedBy?: string;
  cost?: number;
  notes?: string;
}

export interface ListCorrectiveActionsOpts {
  incidentId?: string;
  type?: CorrectiveActionType;
  status?: CorrectiveActionStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toSafetyIncident(row: MemoryRow): SafetyIncident {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as SafetyIncidentType) ?? 'injury',
    description: (c.description as string) ?? '',
    status: (c.status as SafetyIncidentStatus) ?? 'reported',
    severity: (c.severity as string) ?? '',
    location: (c.location as string) ?? '',
    incidentDate: c.incidentDate ? new Date(c.incidentDate as string) : null,
    reportedBy: (c.reportedBy as string) ?? '',
    affectedPerson: (c.affectedPerson as string) ?? '',
    department: (c.department as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toIncidentInvestigation(row: MemoryRow): IncidentInvestigation {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as InvestigationType) ?? 'formal',
    description: (c.description as string) ?? '',
    status: (c.status as InvestigationStatus) ?? 'planned',
    incidentId: (c.incidentId as string) ?? null,
    investigator: (c.investigator as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    findings: (c.findings as string) ?? '',
    recommendations: (c.recommendations as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRootCauseAnalysis(row: MemoryRow): RootCauseAnalysis {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RCAType) ?? 'five_whys',
    description: (c.description as string) ?? '',
    status: (c.status as RCAStatus) ?? 'draft',
    incidentId: (c.incidentId as string) ?? null,
    analyst: (c.analyst as string) ?? '',
    method: (c.method as string) ?? '',
    contributingFactors: (c.contributingFactors as string) ?? '',
    rootCause: (c.rootCause as string) ?? '',
    conclusions: (c.conclusions as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCorrectiveAction(row: MemoryRow): CorrectiveAction {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CorrectiveActionType) ?? 'immediate',
    description: (c.description as string) ?? '',
    status: (c.status as CorrectiveActionStatus) ?? 'planned',
    incidentId: (c.incidentId as string) ?? null,
    priority: (c.priority as string) ?? '',
    assignedTo: (c.assignedTo as string) ?? '',
    dueDate: c.dueDate ? new Date(c.dueDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    verifiedBy: (c.verifiedBy as string) ?? '',
    cost: (c.cost as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const SafetyIncidentService = {
  // ── Safety Incidents ──

  async createSafetyIncident(organizationId: string, workspaceId: string, input: CreateSafetyIncidentInput, createdBy: string): Promise<SafetyIncident> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'reported',
      severity: input.severity ?? '',
      location: input.location ?? '',
      incidentDate: input.incidentDate ?? null,
      reportedBy: input.reportedBy ?? '',
      affectedPerson: input.affectedPerson ?? '',
      department: input.department ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'safety_incident',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['safety_incident', content.type, content.status]),
        createdBy,
      },
    });
    return toSafetyIncident(row as MemoryRow);
  },

  async getSafetyIncident(id: string): Promise<SafetyIncident | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'safety_incident') return null;
    return toSafetyIncident(row as MemoryRow);
  },

  async listSafetyIncidents(organizationId: string, opts: ListSafetyIncidentsOpts = {}): Promise<SafetyIncident[]> {
    const where: Record<string, unknown> = { organizationId, type: 'safety_incident' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSafetyIncident);
  },

  async updateSafetyIncident(id: string, input: UpdateSafetyIncidentInput): Promise<SafetyIncident | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.incidentDate !== undefined && { incidentDate: input.incidentDate }),
      ...(input.reportedBy !== undefined && { reportedBy: input.reportedBy }),
      ...(input.affectedPerson !== undefined && { affectedPerson: input.affectedPerson }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['safety_incident', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toSafetyIncident(row as MemoryRow);
  },

  async deleteSafetyIncident(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async investigateSafetyIncident(id: string, _investigatedBy: string): Promise<SafetyIncident | null> {
    return SafetyIncidentService.updateSafetyIncident(id, { status: 'investigating' });
  },

  async resolveSafetyIncident(id: string, _resolvedBy: string): Promise<SafetyIncident | null> {
    return SafetyIncidentService.updateSafetyIncident(id, { status: 'resolved' });
  },

  async closeSafetyIncident(id: string, _closedBy: string): Promise<SafetyIncident | null> {
    return SafetyIncidentService.updateSafetyIncident(id, { status: 'closed' });
  },

  async reopenSafetyIncident(id: string, _reopenedBy: string): Promise<SafetyIncident | null> {
    return SafetyIncidentService.updateSafetyIncident(id, { status: 'reopened' });
  },

  // ── Incident Investigations ──

  async createIncidentInvestigation(organizationId: string, workspaceId: string, input: CreateIncidentInvestigationInput, createdBy: string): Promise<IncidentInvestigation> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      incidentId: input.incidentId ?? null,
      investigator: input.investigator ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      findings: input.findings ?? '',
      recommendations: input.recommendations ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'incident_investigation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.incidentId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['incident_investigation', content.type, content.status]),
        createdBy,
      },
    });
    return toIncidentInvestigation(row as MemoryRow);
  },

  async getIncidentInvestigation(id: string): Promise<IncidentInvestigation | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'incident_investigation') return null;
    return toIncidentInvestigation(row as MemoryRow);
  },

  async listIncidentInvestigations(organizationId: string, opts: ListIncidentInvestigationsOpts = {}): Promise<IncidentInvestigation[]> {
    const where: Record<string, unknown> = { organizationId, type: 'incident_investigation' };
    const conditions: unknown[] = [];
    if (opts.incidentId) conditions.push({ content: { contains: `"incidentId":"${opts.incidentId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toIncidentInvestigation);
  },

  async updateIncidentInvestigation(id: string, input: UpdateIncidentInvestigationInput): Promise<IncidentInvestigation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.incidentId !== undefined && { incidentId: input.incidentId }),
      ...(input.investigator !== undefined && { investigator: input.investigator }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.findings !== undefined && { findings: input.findings }),
      ...(input.recommendations !== undefined && { recommendations: input.recommendations }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['incident_investigation', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toIncidentInvestigation(row as MemoryRow);
  },

  async deleteIncidentInvestigation(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startInvestigation(id: string, _startedBy: string): Promise<IncidentInvestigation | null> {
    return SafetyIncidentService.updateIncidentInvestigation(id, { status: 'in_progress', startDate: new Date().toISOString() });
  },

  async completeInvestigation(id: string, _completedBy: string): Promise<IncidentInvestigation | null> {
    return SafetyIncidentService.updateIncidentInvestigation(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  async cancelInvestigation(id: string, _cancelledBy: string): Promise<IncidentInvestigation | null> {
    return SafetyIncidentService.updateIncidentInvestigation(id, { status: 'cancelled' });
  },

  // ── Root Cause Analyses ──

  async createRootCauseAnalysis(organizationId: string, workspaceId: string, input: CreateRootCauseAnalysisInput, createdBy: string): Promise<RootCauseAnalysis> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      incidentId: input.incidentId ?? null,
      analyst: input.analyst ?? '',
      method: input.method ?? '',
      contributingFactors: input.contributingFactors ?? '',
      rootCause: input.rootCause ?? '',
      conclusions: input.conclusions ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'root_cause_analysis',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.incidentId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['root_cause_analysis', content.type, content.status]),
        createdBy,
      },
    });
    return toRootCauseAnalysis(row as MemoryRow);
  },

  async getRootCauseAnalysis(id: string): Promise<RootCauseAnalysis | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'root_cause_analysis') return null;
    return toRootCauseAnalysis(row as MemoryRow);
  },

  async listRootCauseAnalyses(organizationId: string, opts: ListRootCauseAnalysesOpts = {}): Promise<RootCauseAnalysis[]> {
    const where: Record<string, unknown> = { organizationId, type: 'root_cause_analysis' };
    const conditions: unknown[] = [];
    if (opts.incidentId) conditions.push({ content: { contains: `"incidentId":"${opts.incidentId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRootCauseAnalysis);
  },

  async updateRootCauseAnalysis(id: string, input: UpdateRootCauseAnalysisInput): Promise<RootCauseAnalysis | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.incidentId !== undefined && { incidentId: input.incidentId }),
      ...(input.analyst !== undefined && { analyst: input.analyst }),
      ...(input.method !== undefined && { method: input.method }),
      ...(input.contributingFactors !== undefined && { contributingFactors: input.contributingFactors }),
      ...(input.rootCause !== undefined && { rootCause: input.rootCause }),
      ...(input.conclusions !== undefined && { conclusions: input.conclusions }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['root_cause_analysis', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRootCauseAnalysis(row as MemoryRow);
  },

  async deleteRootCauseAnalysis(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startRCA(id: string, _startedBy: string): Promise<RootCauseAnalysis | null> {
    return SafetyIncidentService.updateRootCauseAnalysis(id, { status: 'in_progress' });
  },

  async completeRCA(id: string, _completedBy: string): Promise<RootCauseAnalysis | null> {
    return SafetyIncidentService.updateRootCauseAnalysis(id, { status: 'completed' });
  },

  async reviewRCA(id: string, _reviewedBy: string): Promise<RootCauseAnalysis | null> {
    return SafetyIncidentService.updateRootCauseAnalysis(id, { status: 'reviewed' });
  },

  async archiveRCA(id: string, _archivedBy: string): Promise<RootCauseAnalysis | null> {
    return SafetyIncidentService.updateRootCauseAnalysis(id, { status: 'archived' });
  },

  // ── Corrective Actions ──

  async createCorrectiveAction(organizationId: string, workspaceId: string, input: CreateCorrectiveActionInput, createdBy: string): Promise<CorrectiveAction> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      incidentId: input.incidentId ?? null,
      priority: input.priority ?? '',
      assignedTo: input.assignedTo ?? '',
      dueDate: input.dueDate ?? null,
      completedDate: input.completedDate ?? null,
      verifiedBy: input.verifiedBy ?? '',
      cost: input.cost ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'corrective_action',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.incidentId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['corrective_action', content.type, content.status]),
        createdBy,
      },
    });
    return toCorrectiveAction(row as MemoryRow);
  },

  async getCorrectiveAction(id: string): Promise<CorrectiveAction | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'corrective_action') return null;
    return toCorrectiveAction(row as MemoryRow);
  },

  async listCorrectiveActions(organizationId: string, opts: ListCorrectiveActionsOpts = {}): Promise<CorrectiveAction[]> {
    const where: Record<string, unknown> = { organizationId, type: 'corrective_action' };
    const conditions: unknown[] = [];
    if (opts.incidentId) conditions.push({ content: { contains: `"incidentId":"${opts.incidentId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCorrectiveAction);
  },

  async updateCorrectiveAction(id: string, input: UpdateCorrectiveActionInput): Promise<CorrectiveAction | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.incidentId !== undefined && { incidentId: input.incidentId }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.verifiedBy !== undefined && { verifiedBy: input.verifiedBy }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['corrective_action', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCorrectiveAction(row as MemoryRow);
  },

  async deleteCorrectiveAction(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startCorrectiveAction(id: string, _startedBy: string): Promise<CorrectiveAction | null> {
    return SafetyIncidentService.updateCorrectiveAction(id, { status: 'in_progress' });
  },

  async completeCorrectiveAction(id: string, _completedBy: string): Promise<CorrectiveAction | null> {
    return SafetyIncidentService.updateCorrectiveAction(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async verifyCorrectiveAction(id: string, _verifiedBy: string): Promise<CorrectiveAction | null> {
    return SafetyIncidentService.updateCorrectiveAction(id, { status: 'verified' });
  },

  async overdueCorrectiveAction(id: string, _overdueBy: string): Promise<CorrectiveAction | null> {
    return SafetyIncidentService.updateCorrectiveAction(id, { status: 'overdue' });
  },

  async cancelCorrectiveAction(id: string, _cancelledBy: string): Promise<CorrectiveAction | null> {
    return SafetyIncidentService.updateCorrectiveAction(id, { status: 'cancelled' });
  },

  // ── Metrics & Stats ──

  async getSafetyIncidentMetrics(organizationId: string): Promise<SafetyIncidentMetrics> {
    const [incidents, investigations, rcas, actions] = await Promise.all([
      SafetyIncidentService.listSafetyIncidents(organizationId),
      SafetyIncidentService.listIncidentInvestigations(organizationId),
      SafetyIncidentService.listRootCauseAnalyses(organizationId),
      SafetyIncidentService.listCorrectiveActions(organizationId),
    ]);
    return {
      reportedIncidents: incidents.filter((i) => i.status === 'reported' || i.status === 'investigating' || i.status === 'reopened').length,
      activeInvestigations: investigations.filter((i) => i.status === 'in_progress').length,
      completedRCAs: rcas.filter((r) => r.status === 'completed' || r.status === 'reviewed').length,
      activeCorrectiveActions: actions.filter((a) => a.status === 'in_progress').length,
      overdueActions: actions.filter((a) => a.status === 'overdue').length,
    };
  },

  async getSafetyIncidentStats(organizationId: string): Promise<SafetyIncidentStats> {
    const [incidents, investigations, rcas, actions] = await Promise.all([
      SafetyIncidentService.listSafetyIncidents(organizationId),
      SafetyIncidentService.listIncidentInvestigations(organizationId),
      SafetyIncidentService.listRootCauseAnalyses(organizationId),
      SafetyIncidentService.listCorrectiveActions(organizationId),
    ]);
    const byIncidentType: Record<string, number> = {};
    const byIncidentStatus: Record<string, number> = {};
    const byInvestigationType: Record<string, number> = {};
    const byInvestigationStatus: Record<string, number> = {};
    const byRCAType: Record<string, number> = {};
    const byRCAStatus: Record<string, number> = {};
    const byCorrectiveActionType: Record<string, number> = {};
    const byCorrectiveActionStatus: Record<string, number> = {};
    for (const i of incidents) { byIncidentType[i.type] = (byIncidentType[i.type] ?? 0) + 1; byIncidentStatus[i.status] = (byIncidentStatus[i.status] ?? 0) + 1; }
    for (const inv of investigations) { byInvestigationType[inv.type] = (byInvestigationType[inv.type] ?? 0) + 1; byInvestigationStatus[inv.status] = (byInvestigationStatus[inv.status] ?? 0) + 1; }
    for (const r of rcas) { byRCAType[r.type] = (byRCAType[r.type] ?? 0) + 1; byRCAStatus[r.status] = (byRCAStatus[r.status] ?? 0) + 1; }
    for (const a of actions) { byCorrectiveActionType[a.type] = (byCorrectiveActionType[a.type] ?? 0) + 1; byCorrectiveActionStatus[a.status] = (byCorrectiveActionStatus[a.status] ?? 0) + 1; }
    return {
      incidentCount: incidents.length,
      investigationCount: investigations.length,
      rcaCount: rcas.length,
      correctiveActionCount: actions.length,
      byIncidentType, byIncidentStatus, byInvestigationType, byInvestigationStatus, byRCAType, byRCAStatus, byCorrectiveActionType, byCorrectiveActionStatus,
    };
  },
};
