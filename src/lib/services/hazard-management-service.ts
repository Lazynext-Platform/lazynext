import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type HazardType = 'physical' | 'chemical' | 'biological' | 'ergonomic' | 'psychosocial' | 'safety' | 'environmental' | 'fire' | 'electrical' | 'mechanical';
export type HazardStatus = 'identified' | 'assessed' | 'controlled' | 'mitigated' | 'eliminated' | 'archived';
export type RiskAssessmentType = 'qualitative' | 'quantitative' | 'semi_quantitative' | 'matrix' | 'job_safety' | 'hazard_operability';
export type RiskAssessmentStatus = 'draft' | 'in_progress' | 'completed' | 'reviewed' | 'archived';
export type ControlMeasureType = 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe' | 'training' | 'procedure' | 'warning';
export type ControlMeasureStatus = 'planned' | 'implemented' | 'verified' | 'ineffective' | 'deprecated';
export type JSAType = 'routine' | 'non_routine' | 'high_risk' | 'new_task' | 'modified_task' | 'permit_required';
export type JSAStatus = 'draft' | 'in_review' | 'approved' | 'active' | 'archived';

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

export interface Hazard {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: HazardType;
  description: string;
  status: HazardStatus;
  location: string;
  source: string;
  severity: string;
  likelihood: string;
  riskLevel: string;
  identifiedBy: string;
  identifiedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RiskAssessment {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RiskAssessmentType;
  description: string;
  status: RiskAssessmentStatus;
  hazardId: string | null;
  assessor: string;
  assessmentDate: Date | null;
  methodology: string;
  likelihood: string;
  severity: string;
  riskScore: number;
  riskLevel: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ControlMeasure {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ControlMeasureType;
  description: string;
  status: ControlMeasureStatus;
  hazardId: string | null;
  effectiveness: string;
  implementationDate: Date | null;
  verifiedBy: string;
  cost: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobSafetyAnalysis {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: JSAType;
  description: string;
  status: JSAStatus;
  jobTitle: string;
  department: string;
  supervisor: string;
  steps: string;
  hazards: string;
  controls: string;
  reviewDate: Date | null;
  approvedBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HazardManagementMetrics {
  identifiedHazards: number;
  activeAssessments: number;
  implementedControls: number;
  activeJSAs: number;
  highRiskHazards: number;
}

export interface HazardManagementStats {
  hazardCount: number;
  riskAssessmentCount: number;
  controlMeasureCount: number;
  jsaCount: number;
  byHazardType: Record<string, number>;
  byHazardStatus: Record<string, number>;
  byRiskAssessmentType: Record<string, number>;
  byRiskAssessmentStatus: Record<string, number>;
  byControlMeasureType: Record<string, number>;
  byControlMeasureStatus: Record<string, number>;
  byJSAType: Record<string, number>;
  byJSAStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateHazardInput {
  name: string;
  type: HazardType;
  description?: string;
  status?: HazardStatus;
  location?: string;
  source?: string;
  severity?: string;
  likelihood?: string;
  riskLevel?: string;
  identifiedBy?: string;
  identifiedDate?: string;
  notes?: string;
}

export interface UpdateHazardInput {
  name?: string;
  type?: HazardType;
  description?: string;
  status?: HazardStatus;
  location?: string;
  source?: string;
  severity?: string;
  likelihood?: string;
  riskLevel?: string;
  identifiedBy?: string;
  identifiedDate?: string;
  notes?: string;
}

export interface ListHazardsOpts {
  type?: HazardType;
  status?: HazardStatus;
}

export interface CreateRiskAssessmentInput {
  name: string;
  type: RiskAssessmentType;
  description?: string;
  status?: RiskAssessmentStatus;
  hazardId?: string;
  assessor?: string;
  assessmentDate?: string;
  methodology?: string;
  likelihood?: string;
  severity?: string;
  riskScore?: number;
  riskLevel?: string;
  notes?: string;
}

export interface UpdateRiskAssessmentInput {
  name?: string;
  type?: RiskAssessmentType;
  description?: string;
  status?: RiskAssessmentStatus;
  hazardId?: string;
  assessor?: string;
  assessmentDate?: string;
  methodology?: string;
  likelihood?: string;
  severity?: string;
  riskScore?: number;
  riskLevel?: string;
  notes?: string;
}

export interface ListRiskAssessmentsOpts {
  hazardId?: string;
  type?: RiskAssessmentType;
  status?: RiskAssessmentStatus;
}

export interface CreateControlMeasureInput {
  name: string;
  type: ControlMeasureType;
  description?: string;
  status?: ControlMeasureStatus;
  hazardId?: string;
  effectiveness?: string;
  implementationDate?: string;
  verifiedBy?: string;
  cost?: number;
  notes?: string;
}

export interface UpdateControlMeasureInput {
  name?: string;
  type?: ControlMeasureType;
  description?: string;
  status?: ControlMeasureStatus;
  hazardId?: string;
  effectiveness?: string;
  implementationDate?: string;
  verifiedBy?: string;
  cost?: number;
  notes?: string;
}

export interface ListControlMeasuresOpts {
  hazardId?: string;
  type?: ControlMeasureType;
  status?: ControlMeasureStatus;
}

export interface CreateJobSafetyAnalysisInput {
  name: string;
  type: JSAType;
  description?: string;
  status?: JSAStatus;
  jobTitle?: string;
  department?: string;
  supervisor?: string;
  steps?: string;
  hazards?: string;
  controls?: string;
  reviewDate?: string;
  approvedBy?: string;
  notes?: string;
}

export interface UpdateJobSafetyAnalysisInput {
  name?: string;
  type?: JSAType;
  description?: string;
  status?: JSAStatus;
  jobTitle?: string;
  department?: string;
  supervisor?: string;
  steps?: string;
  hazards?: string;
  controls?: string;
  reviewDate?: string;
  approvedBy?: string;
  notes?: string;
}

export interface ListJobSafetyAnalysesOpts {
  type?: JSAType;
  status?: JSAStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toHazard(row: MemoryRow): Hazard {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as HazardType) ?? 'physical',
    description: (c.description as string) ?? '',
    status: (c.status as HazardStatus) ?? 'identified',
    location: (c.location as string) ?? '',
    source: (c.source as string) ?? '',
    severity: (c.severity as string) ?? '',
    likelihood: (c.likelihood as string) ?? '',
    riskLevel: (c.riskLevel as string) ?? '',
    identifiedBy: (c.identifiedBy as string) ?? '',
    identifiedDate: c.identifiedDate ? new Date(c.identifiedDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRiskAssessment(row: MemoryRow): RiskAssessment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RiskAssessmentType) ?? 'qualitative',
    description: (c.description as string) ?? '',
    status: (c.status as RiskAssessmentStatus) ?? 'draft',
    hazardId: (c.hazardId as string) ?? null,
    assessor: (c.assessor as string) ?? '',
    assessmentDate: c.assessmentDate ? new Date(c.assessmentDate as string) : null,
    methodology: (c.methodology as string) ?? '',
    likelihood: (c.likelihood as string) ?? '',
    severity: (c.severity as string) ?? '',
    riskScore: (c.riskScore as number) ?? 0,
    riskLevel: (c.riskLevel as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toControlMeasure(row: MemoryRow): ControlMeasure {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ControlMeasureType) ?? 'elimination',
    description: (c.description as string) ?? '',
    status: (c.status as ControlMeasureStatus) ?? 'planned',
    hazardId: (c.hazardId as string) ?? null,
    effectiveness: (c.effectiveness as string) ?? '',
    implementationDate: c.implementationDate ? new Date(c.implementationDate as string) : null,
    verifiedBy: (c.verifiedBy as string) ?? '',
    cost: (c.cost as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toJobSafetyAnalysis(row: MemoryRow): JobSafetyAnalysis {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as JSAType) ?? 'routine',
    description: (c.description as string) ?? '',
    status: (c.status as JSAStatus) ?? 'draft',
    jobTitle: (c.jobTitle as string) ?? '',
    department: (c.department as string) ?? '',
    supervisor: (c.supervisor as string) ?? '',
    steps: (c.steps as string) ?? '',
    hazards: (c.hazards as string) ?? '',
    controls: (c.controls as string) ?? '',
    reviewDate: c.reviewDate ? new Date(c.reviewDate as string) : null,
    approvedBy: (c.approvedBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const HazardManagementService = {
  // ── Hazards ──

  async createHazard(organizationId: string, workspaceId: string, input: CreateHazardInput, createdBy: string): Promise<Hazard> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'identified',
      location: input.location ?? '',
      source: input.source ?? '',
      severity: input.severity ?? '',
      likelihood: input.likelihood ?? '',
      riskLevel: input.riskLevel ?? '',
      identifiedBy: input.identifiedBy ?? '',
      identifiedDate: input.identifiedDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'hazard',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['hazard', content.type, content.status]),
        createdBy,
      },
    });
    return toHazard(row as MemoryRow);
  },

  async getHazard(id: string): Promise<Hazard | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'hazard') return null;
    return toHazard(row as MemoryRow);
  },

  async listHazards(organizationId: string, opts: ListHazardsOpts = {}): Promise<Hazard[]> {
    const where: Record<string, unknown> = { organizationId, type: 'hazard' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toHazard);
  },

  async updateHazard(id: string, input: UpdateHazardInput): Promise<Hazard | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.likelihood !== undefined && { likelihood: input.likelihood }),
      ...(input.riskLevel !== undefined && { riskLevel: input.riskLevel }),
      ...(input.identifiedBy !== undefined && { identifiedBy: input.identifiedBy }),
      ...(input.identifiedDate !== undefined && { identifiedDate: input.identifiedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['hazard', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toHazard(row as MemoryRow);
  },

  async deleteHazard(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async assessHazard(id: string, _assessedBy: string): Promise<Hazard | null> {
    return HazardManagementService.updateHazard(id, { status: 'assessed' });
  },

  async controlHazard(id: string, _controlledBy: string): Promise<Hazard | null> {
    return HazardManagementService.updateHazard(id, { status: 'controlled' });
  },

  async mitigateHazard(id: string, _mitigatedBy: string): Promise<Hazard | null> {
    return HazardManagementService.updateHazard(id, { status: 'mitigated' });
  },

  async eliminateHazard(id: string, _eliminatedBy: string): Promise<Hazard | null> {
    return HazardManagementService.updateHazard(id, { status: 'eliminated' });
  },

  async archiveHazard(id: string, _archivedBy: string): Promise<Hazard | null> {
    return HazardManagementService.updateHazard(id, { status: 'archived' });
  },

  // ── Risk Assessments ──

  async createRiskAssessment(organizationId: string, workspaceId: string, input: CreateRiskAssessmentInput, createdBy: string): Promise<RiskAssessment> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      hazardId: input.hazardId ?? null,
      assessor: input.assessor ?? '',
      assessmentDate: input.assessmentDate ?? null,
      methodology: input.methodology ?? '',
      likelihood: input.likelihood ?? '',
      severity: input.severity ?? '',
      riskScore: input.riskScore ?? 0,
      riskLevel: input.riskLevel ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'risk_assessment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.hazardId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['risk_assessment', content.type, content.status]),
        createdBy,
      },
    });
    return toRiskAssessment(row as MemoryRow);
  },

  async getRiskAssessment(id: string): Promise<RiskAssessment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'risk_assessment') return null;
    return toRiskAssessment(row as MemoryRow);
  },

  async listRiskAssessments(organizationId: string, opts: ListRiskAssessmentsOpts = {}): Promise<RiskAssessment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'risk_assessment' };
    const conditions: unknown[] = [];
    if (opts.hazardId) conditions.push({ content: { contains: `"hazardId":"${opts.hazardId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRiskAssessment);
  },

  async updateRiskAssessment(id: string, input: UpdateRiskAssessmentInput): Promise<RiskAssessment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.hazardId !== undefined && { hazardId: input.hazardId }),
      ...(input.assessor !== undefined && { assessor: input.assessor }),
      ...(input.assessmentDate !== undefined && { assessmentDate: input.assessmentDate }),
      ...(input.methodology !== undefined && { methodology: input.methodology }),
      ...(input.likelihood !== undefined && { likelihood: input.likelihood }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.riskScore !== undefined && { riskScore: input.riskScore }),
      ...(input.riskLevel !== undefined && { riskLevel: input.riskLevel }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['risk_assessment', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRiskAssessment(row as MemoryRow);
  },

  async deleteRiskAssessment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startRiskAssessment(id: string, _startedBy: string): Promise<RiskAssessment | null> {
    return HazardManagementService.updateRiskAssessment(id, { status: 'in_progress' });
  },

  async completeRiskAssessment(id: string, _completedBy: string): Promise<RiskAssessment | null> {
    return HazardManagementService.updateRiskAssessment(id, { status: 'completed', assessmentDate: new Date().toISOString() });
  },

  async reviewRiskAssessment(id: string, _reviewedBy: string): Promise<RiskAssessment | null> {
    return HazardManagementService.updateRiskAssessment(id, { status: 'reviewed' });
  },

  async archiveRiskAssessment(id: string, _archivedBy: string): Promise<RiskAssessment | null> {
    return HazardManagementService.updateRiskAssessment(id, { status: 'archived' });
  },

  // ── Control Measures ──

  async createControlMeasure(organizationId: string, workspaceId: string, input: CreateControlMeasureInput, createdBy: string): Promise<ControlMeasure> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      hazardId: input.hazardId ?? null,
      effectiveness: input.effectiveness ?? '',
      implementationDate: input.implementationDate ?? null,
      verifiedBy: input.verifiedBy ?? '',
      cost: input.cost ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'control_measure',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.hazardId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['control_measure', content.type, content.status]),
        createdBy,
      },
    });
    return toControlMeasure(row as MemoryRow);
  },

  async getControlMeasure(id: string): Promise<ControlMeasure | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'control_measure') return null;
    return toControlMeasure(row as MemoryRow);
  },

  async listControlMeasures(organizationId: string, opts: ListControlMeasuresOpts = {}): Promise<ControlMeasure[]> {
    const where: Record<string, unknown> = { organizationId, type: 'control_measure' };
    const conditions: unknown[] = [];
    if (opts.hazardId) conditions.push({ content: { contains: `"hazardId":"${opts.hazardId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toControlMeasure);
  },

  async updateControlMeasure(id: string, input: UpdateControlMeasureInput): Promise<ControlMeasure | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.hazardId !== undefined && { hazardId: input.hazardId }),
      ...(input.effectiveness !== undefined && { effectiveness: input.effectiveness }),
      ...(input.implementationDate !== undefined && { implementationDate: input.implementationDate }),
      ...(input.verifiedBy !== undefined && { verifiedBy: input.verifiedBy }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['control_measure', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toControlMeasure(row as MemoryRow);
  },

  async deleteControlMeasure(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async implementControlMeasure(id: string, _implementedBy: string): Promise<ControlMeasure | null> {
    return HazardManagementService.updateControlMeasure(id, { status: 'implemented', implementationDate: new Date().toISOString() });
  },

  async verifyControlMeasure(id: string, _verifiedBy: string): Promise<ControlMeasure | null> {
    return HazardManagementService.updateControlMeasure(id, { status: 'verified' });
  },

  async deprecateControlMeasure(id: string, _deprecatedBy: string): Promise<ControlMeasure | null> {
    return HazardManagementService.updateControlMeasure(id, { status: 'deprecated' });
  },

  async markIneffectiveControlMeasure(id: string, _markedBy: string): Promise<ControlMeasure | null> {
    return HazardManagementService.updateControlMeasure(id, { status: 'ineffective' });
  },

  // ── Job Safety Analyses ──

  async createJobSafetyAnalysis(organizationId: string, workspaceId: string, input: CreateJobSafetyAnalysisInput, createdBy: string): Promise<JobSafetyAnalysis> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      jobTitle: input.jobTitle ?? '',
      department: input.department ?? '',
      supervisor: input.supervisor ?? '',
      steps: input.steps ?? '',
      hazards: input.hazards ?? '',
      controls: input.controls ?? '',
      reviewDate: input.reviewDate ?? null,
      approvedBy: input.approvedBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'job_safety_analysis',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['job_safety_analysis', content.type, content.status]),
        createdBy,
      },
    });
    return toJobSafetyAnalysis(row as MemoryRow);
  },

  async getJobSafetyAnalysis(id: string): Promise<JobSafetyAnalysis | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'job_safety_analysis') return null;
    return toJobSafetyAnalysis(row as MemoryRow);
  },

  async listJobSafetyAnalyses(organizationId: string, opts: ListJobSafetyAnalysesOpts = {}): Promise<JobSafetyAnalysis[]> {
    const where: Record<string, unknown> = { organizationId, type: 'job_safety_analysis' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toJobSafetyAnalysis);
  },

  async updateJobSafetyAnalysis(id: string, input: UpdateJobSafetyAnalysisInput): Promise<JobSafetyAnalysis | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.supervisor !== undefined && { supervisor: input.supervisor }),
      ...(input.steps !== undefined && { steps: input.steps }),
      ...(input.hazards !== undefined && { hazards: input.hazards }),
      ...(input.controls !== undefined && { controls: input.controls }),
      ...(input.reviewDate !== undefined && { reviewDate: input.reviewDate }),
      ...(input.approvedBy !== undefined && { approvedBy: input.approvedBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['job_safety_analysis', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toJobSafetyAnalysis(row as MemoryRow);
  },

  async deleteJobSafetyAnalysis(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async reviewJSA(id: string, _reviewedBy: string): Promise<JobSafetyAnalysis | null> {
    return HazardManagementService.updateJobSafetyAnalysis(id, { status: 'in_review' });
  },

  async approveJSA(id: string, _approvedBy: string): Promise<JobSafetyAnalysis | null> {
    return HazardManagementService.updateJobSafetyAnalysis(id, { status: 'approved' });
  },

  async activateJSA(id: string, _activatedBy: string): Promise<JobSafetyAnalysis | null> {
    return HazardManagementService.updateJobSafetyAnalysis(id, { status: 'active' });
  },

  async archiveJSA(id: string, _archivedBy: string): Promise<JobSafetyAnalysis | null> {
    return HazardManagementService.updateJobSafetyAnalysis(id, { status: 'archived' });
  },

  // ── Metrics & Stats ──

  async getHazardManagementMetrics(organizationId: string): Promise<HazardManagementMetrics> {
    const [hazards, assessments, controls, jsas] = await Promise.all([
      HazardManagementService.listHazards(organizationId),
      HazardManagementService.listRiskAssessments(organizationId),
      HazardManagementService.listControlMeasures(organizationId),
      HazardManagementService.listJobSafetyAnalyses(organizationId),
    ]);
    return {
      identifiedHazards: hazards.filter((h) => h.status === 'identified').length,
      activeAssessments: assessments.filter((a) => a.status === 'in_progress').length,
      implementedControls: controls.filter((c) => c.status === 'implemented').length,
      activeJSAs: jsas.filter((j) => j.status === 'active').length,
      highRiskHazards: hazards.filter((h) => h.riskLevel === 'high').length,
    };
  },

  async getHazardManagementStats(organizationId: string): Promise<HazardManagementStats> {
    const [hazards, assessments, controls, jsas] = await Promise.all([
      HazardManagementService.listHazards(organizationId),
      HazardManagementService.listRiskAssessments(organizationId),
      HazardManagementService.listControlMeasures(organizationId),
      HazardManagementService.listJobSafetyAnalyses(organizationId),
    ]);
    const byHazardType: Record<string, number> = {};
    const byHazardStatus: Record<string, number> = {};
    const byRiskAssessmentType: Record<string, number> = {};
    const byRiskAssessmentStatus: Record<string, number> = {};
    const byControlMeasureType: Record<string, number> = {};
    const byControlMeasureStatus: Record<string, number> = {};
    const byJSAType: Record<string, number> = {};
    const byJSAStatus: Record<string, number> = {};
    for (const h of hazards) { byHazardType[h.type] = (byHazardType[h.type] ?? 0) + 1; byHazardStatus[h.status] = (byHazardStatus[h.status] ?? 0) + 1; }
    for (const a of assessments) { byRiskAssessmentType[a.type] = (byRiskAssessmentType[a.type] ?? 0) + 1; byRiskAssessmentStatus[a.status] = (byRiskAssessmentStatus[a.status] ?? 0) + 1; }
    for (const c of controls) { byControlMeasureType[c.type] = (byControlMeasureType[c.type] ?? 0) + 1; byControlMeasureStatus[c.status] = (byControlMeasureStatus[c.status] ?? 0) + 1; }
    for (const j of jsas) { byJSAType[j.type] = (byJSAType[j.type] ?? 0) + 1; byJSAStatus[j.status] = (byJSAStatus[j.status] ?? 0) + 1; }
    return {
      hazardCount: hazards.length,
      riskAssessmentCount: assessments.length,
      controlMeasureCount: controls.length,
      jsaCount: jsas.length,
      byHazardType, byHazardStatus, byRiskAssessmentType, byRiskAssessmentStatus, byControlMeasureType, byControlMeasureStatus, byJSAType, byJSAStatus,
    };
  },
};
