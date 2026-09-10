import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type MedicalSurveillanceType = 'pre_employment' | 'periodic' | 'exit' | 'special' | 'return_to_work' | 'emergency';
export type MedicalSurveillanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type MedicalExamType = 'physical' | 'vision' | 'hearing' | 'respiratory' | 'drug_test' | 'blood_test' | 'ergonomic' | 'mental_health';
export type MedicalExamStatus = 'scheduled' | 'completed' | 'failed' | 'cancelled' | 'no_show';
export type HealthExposureType = 'chemical' | 'biological' | 'physical' | 'ergonomic' | 'psychosocial' | 'radiation' | 'noise' | 'vibration' | 'temperature';
export type HealthExposureStatus = 'active' | 'monitored' | 'mitigated' | 'resolved' | 'archived';
export type VaccinationType = 'covid19' | 'influenza' | 'hepatitis_b' | 'tetanus' | 'typhoid' | 'yellow_fever' | 'rabies' | 'mmr' | 'other';
export type VaccinationStatus = 'scheduled' | 'administered' | 'boosted' | 'expired' | 'refused';

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

export interface MedicalSurveillance {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: MedicalSurveillanceType;
  description: string;
  status: MedicalSurveillanceStatus;
  employeeId: string;
  employeeName: string;
  program: string;
  frequency: string;
  lastDate: Date | null;
  nextDate: Date | null;
  results: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalExam {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: MedicalExamType;
  description: string;
  status: MedicalExamStatus;
  employeeId: string;
  employeeName: string;
  examDate: Date | null;
  provider: string;
  results: string;
  followUp: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthExposure {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: HealthExposureType;
  description: string;
  status: HealthExposureStatus;
  employeeId: string;
  employeeName: string;
  source: string;
  level: string;
  unit: string;
  exposureDate: Date | null;
  duration: string;
  severity: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaccinationRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: VaccinationType;
  description: string;
  status: VaccinationStatus;
  employeeId: string;
  employeeName: string;
  doseNumber: number;
  administeredDate: Date | null;
  nextDoseDate: Date | null;
  provider: string;
  batchNumber: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OccupationalHealthMetrics {
  scheduledSurveillances: number;
  completedExams: number;
  activeExposures: number;
  administeredVaccinations: number;
  overdueSurveillances: number;
}

export interface OccupationalHealthStats {
  surveillanceCount: number;
  examCount: number;
  exposureCount: number;
  vaccinationCount: number;
  bySurveillanceType: Record<string, number>;
  bySurveillanceStatus: Record<string, number>;
  byExamType: Record<string, number>;
  byExamStatus: Record<string, number>;
  byExposureType: Record<string, number>;
  byExposureStatus: Record<string, number>;
  byVaccinationType: Record<string, number>;
  byVaccinationStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateMedicalSurveillanceInput {
  name: string;
  type: MedicalSurveillanceType;
  description?: string;
  status?: MedicalSurveillanceStatus;
  employeeId?: string;
  employeeName?: string;
  program?: string;
  frequency?: string;
  lastDate?: string;
  nextDate?: string;
  results?: string;
  notes?: string;
}

export interface UpdateMedicalSurveillanceInput {
  name?: string;
  type?: MedicalSurveillanceType;
  description?: string;
  status?: MedicalSurveillanceStatus;
  employeeId?: string;
  employeeName?: string;
  program?: string;
  frequency?: string;
  lastDate?: string;
  nextDate?: string;
  results?: string;
  notes?: string;
}

export interface ListMedicalSurveillancesOpts {
  type?: MedicalSurveillanceType;
  status?: MedicalSurveillanceStatus;
}

export interface CreateMedicalExamInput {
  name: string;
  type: MedicalExamType;
  description?: string;
  status?: MedicalExamStatus;
  employeeId?: string;
  employeeName?: string;
  examDate?: string;
  provider?: string;
  results?: string;
  followUp?: string;
  notes?: string;
}

export interface UpdateMedicalExamInput {
  name?: string;
  type?: MedicalExamType;
  description?: string;
  status?: MedicalExamStatus;
  employeeId?: string;
  employeeName?: string;
  examDate?: string;
  provider?: string;
  results?: string;
  followUp?: string;
  notes?: string;
}

export interface ListMedicalExamsOpts {
  type?: MedicalExamType;
  status?: MedicalExamStatus;
}

export interface CreateHealthExposureInput {
  name: string;
  type: HealthExposureType;
  description?: string;
  status?: HealthExposureStatus;
  employeeId?: string;
  employeeName?: string;
  source?: string;
  level?: string;
  unit?: string;
  exposureDate?: string;
  duration?: string;
  severity?: string;
  notes?: string;
}

export interface UpdateHealthExposureInput {
  name?: string;
  type?: HealthExposureType;
  description?: string;
  status?: HealthExposureStatus;
  employeeId?: string;
  employeeName?: string;
  source?: string;
  level?: string;
  unit?: string;
  exposureDate?: string;
  duration?: string;
  severity?: string;
  notes?: string;
}

export interface ListHealthExposuresOpts {
  type?: HealthExposureType;
  status?: HealthExposureStatus;
}

export interface CreateVaccinationRecordInput {
  name: string;
  type: VaccinationType;
  description?: string;
  status?: VaccinationStatus;
  employeeId?: string;
  employeeName?: string;
  doseNumber?: number;
  administeredDate?: string;
  nextDoseDate?: string;
  provider?: string;
  batchNumber?: string;
  notes?: string;
}

export interface UpdateVaccinationRecordInput {
  name?: string;
  type?: VaccinationType;
  description?: string;
  status?: VaccinationStatus;
  employeeId?: string;
  employeeName?: string;
  doseNumber?: number;
  administeredDate?: string;
  nextDoseDate?: string;
  provider?: string;
  batchNumber?: string;
  notes?: string;
}

export interface ListVaccinationRecordsOpts {
  type?: VaccinationType;
  status?: VaccinationStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toMedicalSurveillance(row: MemoryRow): MedicalSurveillance {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as MedicalSurveillanceType) ?? 'pre_employment',
    description: (c.description as string) ?? '',
    status: (c.status as MedicalSurveillanceStatus) ?? 'scheduled',
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    program: (c.program as string) ?? '',
    frequency: (c.frequency as string) ?? '',
    lastDate: c.lastDate ? new Date(c.lastDate as string) : null,
    nextDate: c.nextDate ? new Date(c.nextDate as string) : null,
    results: (c.results as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMedicalExam(row: MemoryRow): MedicalExam {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as MedicalExamType) ?? 'physical',
    description: (c.description as string) ?? '',
    status: (c.status as MedicalExamStatus) ?? 'scheduled',
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    examDate: c.examDate ? new Date(c.examDate as string) : null,
    provider: (c.provider as string) ?? '',
    results: (c.results as string) ?? '',
    followUp: (c.followUp as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toHealthExposure(row: MemoryRow): HealthExposure {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as HealthExposureType) ?? 'chemical',
    description: (c.description as string) ?? '',
    status: (c.status as HealthExposureStatus) ?? 'active',
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    source: (c.source as string) ?? '',
    level: (c.level as string) ?? '',
    unit: (c.unit as string) ?? '',
    exposureDate: c.exposureDate ? new Date(c.exposureDate as string) : null,
    duration: (c.duration as string) ?? '',
    severity: (c.severity as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toVaccinationRecord(row: MemoryRow): VaccinationRecord {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as VaccinationType) ?? 'covid19',
    description: (c.description as string) ?? '',
    status: (c.status as VaccinationStatus) ?? 'scheduled',
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    doseNumber: (c.doseNumber as number) ?? 0,
    administeredDate: c.administeredDate ? new Date(c.administeredDate as string) : null,
    nextDoseDate: c.nextDoseDate ? new Date(c.nextDoseDate as string) : null,
    provider: (c.provider as string) ?? '',
    batchNumber: (c.batchNumber as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const OccupationalHealthService = {
  // ── Medical Surveillances ──

  async createMedicalSurveillance(organizationId: string, workspaceId: string, input: CreateMedicalSurveillanceInput, createdBy: string): Promise<MedicalSurveillance> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      employeeId: input.employeeId ?? '',
      employeeName: input.employeeName ?? '',
      program: input.program ?? '',
      frequency: input.frequency ?? '',
      lastDate: input.lastDate ?? null,
      nextDate: input.nextDate ?? null,
      results: input.results ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'medical_surveillance',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['medical_surveillance', content.type, content.status]),
        createdBy,
      },
    });
    return toMedicalSurveillance(row as MemoryRow);
  },

  async getMedicalSurveillance(id: string): Promise<MedicalSurveillance | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'medical_surveillance') return null;
    return toMedicalSurveillance(row as MemoryRow);
  },

  async listMedicalSurveillances(organizationId: string, opts: ListMedicalSurveillancesOpts = {}): Promise<MedicalSurveillance[]> {
    const where: Record<string, unknown> = { organizationId, type: 'medical_surveillance' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toMedicalSurveillance);
  },

  async updateMedicalSurveillance(id: string, input: UpdateMedicalSurveillanceInput): Promise<MedicalSurveillance | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName }),
      ...(input.program !== undefined && { program: input.program }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.lastDate !== undefined && { lastDate: input.lastDate }),
      ...(input.nextDate !== undefined && { nextDate: input.nextDate }),
      ...(input.results !== undefined && { results: input.results }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['medical_surveillance', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toMedicalSurveillance(row as MemoryRow);
  },

  async deleteMedicalSurveillance(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async scheduleMedicalSurveillance(id: string, _scheduledBy: string): Promise<MedicalSurveillance | null> {
    return OccupationalHealthService.updateMedicalSurveillance(id, { status: 'scheduled' });
  },

  async startMedicalSurveillance(id: string, _startedBy: string): Promise<MedicalSurveillance | null> {
    return OccupationalHealthService.updateMedicalSurveillance(id, { status: 'in_progress' });
  },

  async completeMedicalSurveillance(id: string, _completedBy: string): Promise<MedicalSurveillance | null> {
    return OccupationalHealthService.updateMedicalSurveillance(id, { status: 'completed', lastDate: new Date().toISOString() });
  },

  async cancelMedicalSurveillance(id: string, _cancelledBy: string): Promise<MedicalSurveillance | null> {
    return OccupationalHealthService.updateMedicalSurveillance(id, { status: 'cancelled' });
  },

  async overdueMedicalSurveillance(id: string, _overdueBy: string): Promise<MedicalSurveillance | null> {
    return OccupationalHealthService.updateMedicalSurveillance(id, { status: 'overdue' });
  },

  // ── Medical Exams ──

  async createMedicalExam(organizationId: string, workspaceId: string, input: CreateMedicalExamInput, createdBy: string): Promise<MedicalExam> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      employeeId: input.employeeId ?? '',
      employeeName: input.employeeName ?? '',
      examDate: input.examDate ?? null,
      provider: input.provider ?? '',
      results: input.results ?? '',
      followUp: input.followUp ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'medical_exam',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['medical_exam', content.type, content.status]),
        createdBy,
      },
    });
    return toMedicalExam(row as MemoryRow);
  },

  async getMedicalExam(id: string): Promise<MedicalExam | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'medical_exam') return null;
    return toMedicalExam(row as MemoryRow);
  },

  async listMedicalExams(organizationId: string, opts: ListMedicalExamsOpts = {}): Promise<MedicalExam[]> {
    const where: Record<string, unknown> = { organizationId, type: 'medical_exam' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toMedicalExam);
  },

  async updateMedicalExam(id: string, input: UpdateMedicalExamInput): Promise<MedicalExam | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName }),
      ...(input.examDate !== undefined && { examDate: input.examDate }),
      ...(input.provider !== undefined && { provider: input.provider }),
      ...(input.results !== undefined && { results: input.results }),
      ...(input.followUp !== undefined && { followUp: input.followUp }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['medical_exam', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toMedicalExam(row as MemoryRow);
  },

  async deleteMedicalExam(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async scheduleMedicalExam(id: string, _scheduledBy: string): Promise<MedicalExam | null> {
    return OccupationalHealthService.updateMedicalExam(id, { status: 'scheduled' });
  },

  async completeMedicalExam(id: string, _completedBy: string): Promise<MedicalExam | null> {
    return OccupationalHealthService.updateMedicalExam(id, { status: 'completed', examDate: new Date().toISOString() });
  },

  async failMedicalExam(id: string, _failedBy: string): Promise<MedicalExam | null> {
    return OccupationalHealthService.updateMedicalExam(id, { status: 'failed' });
  },

  async cancelMedicalExam(id: string, _cancelledBy: string): Promise<MedicalExam | null> {
    return OccupationalHealthService.updateMedicalExam(id, { status: 'cancelled' });
  },

  async noShowMedicalExam(id: string, _noShowBy: string): Promise<MedicalExam | null> {
    return OccupationalHealthService.updateMedicalExam(id, { status: 'no_show' });
  },

  // ── Health Exposures ──

  async createHealthExposure(organizationId: string, workspaceId: string, input: CreateHealthExposureInput, createdBy: string): Promise<HealthExposure> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      employeeId: input.employeeId ?? '',
      employeeName: input.employeeName ?? '',
      source: input.source ?? '',
      level: input.level ?? '',
      unit: input.unit ?? '',
      exposureDate: input.exposureDate ?? null,
      duration: input.duration ?? '',
      severity: input.severity ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'health_exposure',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['health_exposure', content.type, content.status]),
        createdBy,
      },
    });
    return toHealthExposure(row as MemoryRow);
  },

  async getHealthExposure(id: string): Promise<HealthExposure | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'health_exposure') return null;
    return toHealthExposure(row as MemoryRow);
  },

  async listHealthExposures(organizationId: string, opts: ListHealthExposuresOpts = {}): Promise<HealthExposure[]> {
    const where: Record<string, unknown> = { organizationId, type: 'health_exposure' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toHealthExposure);
  },

  async updateHealthExposure(id: string, input: UpdateHealthExposureInput): Promise<HealthExposure | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.level !== undefined && { level: input.level }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.exposureDate !== undefined && { exposureDate: input.exposureDate }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['health_exposure', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toHealthExposure(row as MemoryRow);
  },

  async deleteHealthExposure(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async monitorHealthExposure(id: string, _monitoredBy: string): Promise<HealthExposure | null> {
    return OccupationalHealthService.updateHealthExposure(id, { status: 'monitored' });
  },

  async mitigateHealthExposure(id: string, _mitigatedBy: string): Promise<HealthExposure | null> {
    return OccupationalHealthService.updateHealthExposure(id, { status: 'mitigated' });
  },

  async resolveHealthExposure(id: string, _resolvedBy: string): Promise<HealthExposure | null> {
    return OccupationalHealthService.updateHealthExposure(id, { status: 'resolved' });
  },

  async archiveHealthExposure(id: string, _archivedBy: string): Promise<HealthExposure | null> {
    return OccupationalHealthService.updateHealthExposure(id, { status: 'archived' });
  },

  // ── Vaccination Records ──

  async createVaccinationRecord(organizationId: string, workspaceId: string, input: CreateVaccinationRecordInput, createdBy: string): Promise<VaccinationRecord> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      employeeId: input.employeeId ?? '',
      employeeName: input.employeeName ?? '',
      doseNumber: input.doseNumber ?? 0,
      administeredDate: input.administeredDate ?? null,
      nextDoseDate: input.nextDoseDate ?? null,
      provider: input.provider ?? '',
      batchNumber: input.batchNumber ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'vaccination_record',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['vaccination_record', content.type, content.status]),
        createdBy,
      },
    });
    return toVaccinationRecord(row as MemoryRow);
  },

  async getVaccinationRecord(id: string): Promise<VaccinationRecord | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'vaccination_record') return null;
    return toVaccinationRecord(row as MemoryRow);
  },

  async listVaccinationRecords(organizationId: string, opts: ListVaccinationRecordsOpts = {}): Promise<VaccinationRecord[]> {
    const where: Record<string, unknown> = { organizationId, type: 'vaccination_record' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toVaccinationRecord);
  },

  async updateVaccinationRecord(id: string, input: UpdateVaccinationRecordInput): Promise<VaccinationRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName }),
      ...(input.doseNumber !== undefined && { doseNumber: input.doseNumber }),
      ...(input.administeredDate !== undefined && { administeredDate: input.administeredDate }),
      ...(input.nextDoseDate !== undefined && { nextDoseDate: input.nextDoseDate }),
      ...(input.provider !== undefined && { provider: input.provider }),
      ...(input.batchNumber !== undefined && { batchNumber: input.batchNumber }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['vaccination_record', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toVaccinationRecord(row as MemoryRow);
  },

  async deleteVaccinationRecord(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async administerVaccination(id: string, _administeredBy: string): Promise<VaccinationRecord | null> {
    return OccupationalHealthService.updateVaccinationRecord(id, { status: 'administered', administeredDate: new Date().toISOString() });
  },

  async boostVaccination(id: string, _boostedBy: string): Promise<VaccinationRecord | null> {
    return OccupationalHealthService.updateVaccinationRecord(id, { status: 'boosted', administeredDate: new Date().toISOString() });
  },

  async expireVaccination(id: string, _expiredBy: string): Promise<VaccinationRecord | null> {
    return OccupationalHealthService.updateVaccinationRecord(id, { status: 'expired' });
  },

  async refuseVaccination(id: string, _refusedBy: string): Promise<VaccinationRecord | null> {
    return OccupationalHealthService.updateVaccinationRecord(id, { status: 'refused' });
  },

  // ── Metrics & Stats ──

  async getOccupationalHealthMetrics(organizationId: string): Promise<OccupationalHealthMetrics> {
    const [surveillances, exams, exposures, vaccinations] = await Promise.all([
      OccupationalHealthService.listMedicalSurveillances(organizationId),
      OccupationalHealthService.listMedicalExams(organizationId),
      OccupationalHealthService.listHealthExposures(organizationId),
      OccupationalHealthService.listVaccinationRecords(organizationId),
    ]);
    return {
      scheduledSurveillances: surveillances.filter((s) => s.status === 'scheduled').length,
      completedExams: exams.filter((e) => e.status === 'completed').length,
      activeExposures: exposures.filter((e) => e.status === 'active').length,
      administeredVaccinations: vaccinations.filter((v) => v.status === 'administered').length,
      overdueSurveillances: surveillances.filter((s) => s.status === 'overdue').length,
    };
  },

  async getOccupationalHealthStats(organizationId: string): Promise<OccupationalHealthStats> {
    const [surveillances, exams, exposures, vaccinations] = await Promise.all([
      OccupationalHealthService.listMedicalSurveillances(organizationId),
      OccupationalHealthService.listMedicalExams(organizationId),
      OccupationalHealthService.listHealthExposures(organizationId),
      OccupationalHealthService.listVaccinationRecords(organizationId),
    ]);
    const bySurveillanceType: Record<string, number> = {};
    const bySurveillanceStatus: Record<string, number> = {};
    const byExamType: Record<string, number> = {};
    const byExamStatus: Record<string, number> = {};
    const byExposureType: Record<string, number> = {};
    const byExposureStatus: Record<string, number> = {};
    const byVaccinationType: Record<string, number> = {};
    const byVaccinationStatus: Record<string, number> = {};
    for (const s of surveillances) { bySurveillanceType[s.type] = (bySurveillanceType[s.type] ?? 0) + 1; bySurveillanceStatus[s.status] = (bySurveillanceStatus[s.status] ?? 0) + 1; }
    for (const e of exams) { byExamType[e.type] = (byExamType[e.type] ?? 0) + 1; byExamStatus[e.status] = (byExamStatus[e.status] ?? 0) + 1; }
    for (const ex of exposures) { byExposureType[ex.type] = (byExposureType[ex.type] ?? 0) + 1; byExposureStatus[ex.status] = (byExposureStatus[ex.status] ?? 0) + 1; }
    for (const v of vaccinations) { byVaccinationType[v.type] = (byVaccinationType[v.type] ?? 0) + 1; byVaccinationStatus[v.status] = (byVaccinationStatus[v.status] ?? 0) + 1; }
    return {
      surveillanceCount: surveillances.length,
      examCount: exams.length,
      exposureCount: exposures.length,
      vaccinationCount: vaccinations.length,
      bySurveillanceType, bySurveillanceStatus, byExamType, byExamStatus, byExposureType, byExposureStatus, byVaccinationType, byVaccinationStatus,
    };
  },
};
