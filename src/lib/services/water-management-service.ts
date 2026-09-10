import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type WaterMeterType = 'main' | 'sub_meter' | 'irrigation' | 'cooling' | 'heating' | 'domestic' | 'industrial' | 'smart';
export type WaterMeterStatus = 'active' | 'maintained' | 'calibrating' | 'decommissioned' | 'offline' | 'pending';
export type WaterReadingType = 'consumption' | 'estimated' | 'adjustment' | 'leak' | 'backflow' | 'peak';
export type WaterReadingStatus = 'submitted' | 'verified' | 'flagged' | 'archived' | 'pending';
export type WaterQualityTestType = 'ph' | 'chlorine' | 'bacteria' | 'lead' | 'turbidity' | 'hardness' | 'contamination' | 'general';
export type WaterQualityTestStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'retest';
export type ConservationProgramType = 'reduction' | 'reuse' | 'recycling' | 'rainwater' | 'greywater' | 'leak_detection' | 'education';
export type ConservationProgramStatus = 'planned' | 'active' | 'suspended' | 'completed' | 'archived';

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

export interface WaterMeter {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: WaterMeterType;
  description: string;
  status: WaterMeterStatus;
  location: string;
  building: string;
  unit: string;
  capacity: number;
  lastCalibrated: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaterReading {
  id: string;
  organizationId: string;
  workspaceId: string;
  meterId: string | null;
  type: WaterReadingType;
  description: string;
  status: WaterReadingStatus;
  value: number;
  unit: string;
  readingDate: Date | null;
  previousValue: number;
  consumption: number;
  cost: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaterQualityTest {
  id: string;
  organizationId: string;
  workspaceId: string;
  meterId: string | null;
  type: WaterQualityTestType;
  description: string;
  status: WaterQualityTestStatus;
  scheduledDate: Date | null;
  completedDate: Date | null;
  result: string;
  parameter: string;
  value: number;
  unit: string;
  passFail: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConservationProgram {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ConservationProgramType;
  description: string;
  status: ConservationProgramStatus;
  startDate: Date | null;
  endDate: Date | null;
  targetReduction: number;
  actualReduction: number;
  unit: string;
  participants: number;
  coordinator: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaterManagementMetrics {
  activeMeters: number;
  pendingReadings: number;
  pendingTests: number;
  activePrograms: number;
  totalConsumption: number;
}

export interface WaterManagementStats {
  meterCount: number;
  readingCount: number;
  testCount: number;
  programCount: number;
  byMeterType: Record<string, number>;
  byMeterStatus: Record<string, number>;
  byReadingType: Record<string, number>;
  byReadingStatus: Record<string, number>;
  byTestType: Record<string, number>;
  byTestStatus: Record<string, number>;
  byProgramType: Record<string, number>;
  byProgramStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateWaterMeterInput {
  name: string;
  type: WaterMeterType;
  description?: string;
  status?: WaterMeterStatus;
  location?: string;
  building?: string;
  unit?: string;
  capacity?: number;
  lastCalibrated?: string;
  notes?: string;
}

export interface UpdateWaterMeterInput {
  name?: string;
  type?: WaterMeterType;
  description?: string;
  status?: WaterMeterStatus;
  location?: string;
  building?: string;
  unit?: string;
  capacity?: number;
  lastCalibrated?: string;
  notes?: string;
}

export interface ListWaterMetersOpts {
  type?: WaterMeterType;
  status?: WaterMeterStatus;
}

export interface CreateWaterReadingInput {
  meterId?: string;
  type: WaterReadingType;
  description?: string;
  status?: WaterReadingStatus;
  value?: number;
  unit?: string;
  readingDate?: string;
  previousValue?: number;
  consumption?: number;
  cost?: number;
  notes?: string;
}

export interface UpdateWaterReadingInput {
  meterId?: string;
  type?: WaterReadingType;
  description?: string;
  status?: WaterReadingStatus;
  value?: number;
  unit?: string;
  readingDate?: string;
  previousValue?: number;
  consumption?: number;
  cost?: number;
  notes?: string;
}

export interface ListWaterReadingsOpts {
  meterId?: string;
  type?: WaterReadingType;
  status?: WaterReadingStatus;
}

export interface CreateWaterQualityTestInput {
  meterId?: string;
  type: WaterQualityTestType;
  description?: string;
  status?: WaterQualityTestStatus;
  scheduledDate?: string;
  completedDate?: string;
  result?: string;
  parameter?: string;
  value?: number;
  unit?: string;
  passFail?: string;
  notes?: string;
}

export interface UpdateWaterQualityTestInput {
  meterId?: string;
  type?: WaterQualityTestType;
  description?: string;
  status?: WaterQualityTestStatus;
  scheduledDate?: string;
  completedDate?: string;
  result?: string;
  parameter?: string;
  value?: number;
  unit?: string;
  passFail?: string;
  notes?: string;
}

export interface ListWaterQualityTestsOpts {
  meterId?: string;
  type?: WaterQualityTestType;
  status?: WaterQualityTestStatus;
}

export interface CreateConservationProgramInput {
  name: string;
  type: ConservationProgramType;
  description?: string;
  status?: ConservationProgramStatus;
  startDate?: string;
  endDate?: string;
  targetReduction?: number;
  actualReduction?: number;
  unit?: string;
  participants?: number;
  coordinator?: string;
  notes?: string;
}

export interface UpdateConservationProgramInput {
  name?: string;
  type?: ConservationProgramType;
  description?: string;
  status?: ConservationProgramStatus;
  startDate?: string;
  endDate?: string;
  targetReduction?: number;
  actualReduction?: number;
  unit?: string;
  participants?: number;
  coordinator?: string;
  notes?: string;
}

export interface ListConservationProgramsOpts {
  type?: ConservationProgramType;
  status?: ConservationProgramStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toWaterMeter(row: MemoryRow): WaterMeter {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as WaterMeterType) ?? 'main',
    description: (c.description as string) ?? '',
    status: (c.status as WaterMeterStatus) ?? 'pending',
    location: (c.location as string) ?? '',
    building: (c.building as string) ?? '',
    unit: (c.unit as string) ?? '',
    capacity: (c.capacity as number) ?? 0,
    lastCalibrated: c.lastCalibrated ? new Date(c.lastCalibrated as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toWaterReading(row: MemoryRow): WaterReading {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    meterId: (c.meterId as string) ?? null,
    type: (c.type as WaterReadingType) ?? 'consumption',
    description: (c.description as string) ?? '',
    status: (c.status as WaterReadingStatus) ?? 'pending',
    value: (c.value as number) ?? 0,
    unit: (c.unit as string) ?? '',
    readingDate: c.readingDate ? new Date(c.readingDate as string) : null,
    previousValue: (c.previousValue as number) ?? 0,
    consumption: (c.consumption as number) ?? 0,
    cost: (c.cost as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toWaterQualityTest(row: MemoryRow): WaterQualityTest {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    meterId: (c.meterId as string) ?? null,
    type: (c.type as WaterQualityTestType) ?? 'general',
    description: (c.description as string) ?? '',
    status: (c.status as WaterQualityTestStatus) ?? 'scheduled',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    result: (c.result as string) ?? '',
    parameter: (c.parameter as string) ?? '',
    value: (c.value as number) ?? 0,
    unit: (c.unit as string) ?? '',
    passFail: (c.passFail as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toConservationProgram(row: MemoryRow): ConservationProgram {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ConservationProgramType) ?? 'reduction',
    description: (c.description as string) ?? '',
    status: (c.status as ConservationProgramStatus) ?? 'planned',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    targetReduction: (c.targetReduction as number) ?? 0,
    actualReduction: (c.actualReduction as number) ?? 0,
    unit: (c.unit as string) ?? '',
    participants: (c.participants as number) ?? 0,
    coordinator: (c.coordinator as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const WaterManagementService = {
  // ── Water Meters ──

  async createWaterMeter(organizationId: string, workspaceId: string, input: CreateWaterMeterInput, createdBy: string): Promise<WaterMeter> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      location: input.location ?? '',
      building: input.building ?? '',
      unit: input.unit ?? '',
      capacity: input.capacity ?? 0,
      lastCalibrated: input.lastCalibrated ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'water_meter',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['water_meter', content.type, content.status]),
        createdBy,
      },
    });
    return toWaterMeter(row as MemoryRow);
  },

  async getWaterMeter(id: string): Promise<WaterMeter | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'water_meter') return null;
    return toWaterMeter(row as MemoryRow);
  },

  async listWaterMeters(organizationId: string, opts: ListWaterMetersOpts = {}): Promise<WaterMeter[]> {
    const where: Record<string, unknown> = { organizationId, type: 'water_meter' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toWaterMeter);
  },

  async updateWaterMeter(id: string, input: UpdateWaterMeterInput): Promise<WaterMeter | null> {
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
      ...(input.building !== undefined && { building: input.building }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.lastCalibrated !== undefined && { lastCalibrated: input.lastCalibrated }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['water_meter', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toWaterMeter(row as MemoryRow);
  },

  async deleteWaterMeter(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateWaterMeter(id: string, _activatedBy: string): Promise<WaterMeter | null> {
    return WaterManagementService.updateWaterMeter(id, { status: 'active' });
  },

  async maintainWaterMeter(id: string, _maintainedBy: string): Promise<WaterMeter | null> {
    return WaterManagementService.updateWaterMeter(id, { status: 'maintained' });
  },

  async calibrateWaterMeter(id: string, _calibratedBy: string): Promise<WaterMeter | null> {
    return WaterManagementService.updateWaterMeter(id, { status: 'calibrating', lastCalibrated: new Date().toISOString() });
  },

  async decommissionWaterMeter(id: string, _decommissionedBy: string): Promise<WaterMeter | null> {
    return WaterManagementService.updateWaterMeter(id, { status: 'decommissioned' });
  },

  // ── Water Readings ──

  async createWaterReading(organizationId: string, workspaceId: string, input: CreateWaterReadingInput, createdBy: string): Promise<WaterReading> {
    const content = {
      meterId: input.meterId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      value: input.value ?? 0,
      unit: input.unit ?? '',
      readingDate: input.readingDate ?? null,
      previousValue: input.previousValue ?? 0,
      consumption: input.consumption ?? 0,
      cost: input.cost ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'water_reading',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.meterId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['water_reading', content.type, content.status]),
        createdBy,
      },
    });
    return toWaterReading(row as MemoryRow);
  },

  async getWaterReading(id: string): Promise<WaterReading | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'water_reading') return null;
    return toWaterReading(row as MemoryRow);
  },

  async listWaterReadings(organizationId: string, opts: ListWaterReadingsOpts = {}): Promise<WaterReading[]> {
    const where: Record<string, unknown> = { organizationId, type: 'water_reading' };
    const conditions: unknown[] = [];
    if (opts.meterId) conditions.push({ content: { contains: `"meterId":"${opts.meterId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toWaterReading);
  },

  async updateWaterReading(id: string, input: UpdateWaterReadingInput): Promise<WaterReading | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.meterId !== undefined && { meterId: input.meterId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.readingDate !== undefined && { readingDate: input.readingDate }),
      ...(input.previousValue !== undefined && { previousValue: input.previousValue }),
      ...(input.consumption !== undefined && { consumption: input.consumption }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['water_reading', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toWaterReading(row as MemoryRow);
  },

  async deleteWaterReading(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async submitWaterReading(id: string, _submittedBy: string): Promise<WaterReading | null> {
    return WaterManagementService.updateWaterReading(id, { status: 'submitted' });
  },

  async verifyWaterReading(id: string, _verifiedBy: string): Promise<WaterReading | null> {
    return WaterManagementService.updateWaterReading(id, { status: 'verified' });
  },

  async flagWaterReading(id: string, _flaggedBy: string): Promise<WaterReading | null> {
    return WaterManagementService.updateWaterReading(id, { status: 'flagged' });
  },

  async archiveWaterReading(id: string, _archivedBy: string): Promise<WaterReading | null> {
    return WaterManagementService.updateWaterReading(id, { status: 'archived' });
  },

  // ── Water Quality Tests ──

  async createWaterQualityTest(organizationId: string, workspaceId: string, input: CreateWaterQualityTestInput, createdBy: string): Promise<WaterQualityTest> {
    const content = {
      meterId: input.meterId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      result: input.result ?? '',
      parameter: input.parameter ?? '',
      value: input.value ?? 0,
      unit: input.unit ?? '',
      passFail: input.passFail ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'water_quality_test',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.meterId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['water_quality_test', content.type, content.status]),
        createdBy,
      },
    });
    return toWaterQualityTest(row as MemoryRow);
  },

  async getWaterQualityTest(id: string): Promise<WaterQualityTest | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'water_quality_test') return null;
    return toWaterQualityTest(row as MemoryRow);
  },

  async listWaterQualityTests(organizationId: string, opts: ListWaterQualityTestsOpts = {}): Promise<WaterQualityTest[]> {
    const where: Record<string, unknown> = { organizationId, type: 'water_quality_test' };
    const conditions: unknown[] = [];
    if (opts.meterId) conditions.push({ content: { contains: `"meterId":"${opts.meterId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toWaterQualityTest);
  },

  async updateWaterQualityTest(id: string, input: UpdateWaterQualityTestInput): Promise<WaterQualityTest | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.meterId !== undefined && { meterId: input.meterId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.result !== undefined && { result: input.result }),
      ...(input.parameter !== undefined && { parameter: input.parameter }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.passFail !== undefined && { passFail: input.passFail }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['water_quality_test', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toWaterQualityTest(row as MemoryRow);
  },

  async deleteWaterQualityTest(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async scheduleWaterQualityTest(id: string, _scheduledBy: string): Promise<WaterQualityTest | null> {
    return WaterManagementService.updateWaterQualityTest(id, { status: 'scheduled' });
  },

  async startWaterQualityTest(id: string, _startedBy: string): Promise<WaterQualityTest | null> {
    return WaterManagementService.updateWaterQualityTest(id, { status: 'in_progress' });
  },

  async completeWaterQualityTest(id: string, _completedBy: string): Promise<WaterQualityTest | null> {
    return WaterManagementService.updateWaterQualityTest(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async failWaterQualityTest(id: string, _failedBy: string): Promise<WaterQualityTest | null> {
    return WaterManagementService.updateWaterQualityTest(id, { status: 'failed', completedDate: new Date().toISOString() });
  },

  async retestWaterQualityTest(id: string, _retestBy: string): Promise<WaterQualityTest | null> {
    return WaterManagementService.updateWaterQualityTest(id, { status: 'retest' });
  },

  // ── Conservation Programs ──

  async createConservationProgram(organizationId: string, workspaceId: string, input: CreateConservationProgramInput, createdBy: string): Promise<ConservationProgram> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      targetReduction: input.targetReduction ?? 0,
      actualReduction: input.actualReduction ?? 0,
      unit: input.unit ?? '',
      participants: input.participants ?? 0,
      coordinator: input.coordinator ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'conservation_program',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['conservation_program', content.type, content.status]),
        createdBy,
      },
    });
    return toConservationProgram(row as MemoryRow);
  },

  async getConservationProgram(id: string): Promise<ConservationProgram | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'conservation_program') return null;
    return toConservationProgram(row as MemoryRow);
  },

  async listConservationPrograms(organizationId: string, opts: ListConservationProgramsOpts = {}): Promise<ConservationProgram[]> {
    const where: Record<string, unknown> = { organizationId, type: 'conservation_program' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toConservationProgram);
  },

  async updateConservationProgram(id: string, input: UpdateConservationProgramInput): Promise<ConservationProgram | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.targetReduction !== undefined && { targetReduction: input.targetReduction }),
      ...(input.actualReduction !== undefined && { actualReduction: input.actualReduction }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.participants !== undefined && { participants: input.participants }),
      ...(input.coordinator !== undefined && { coordinator: input.coordinator }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['conservation_program', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toConservationProgram(row as MemoryRow);
  },

  async deleteConservationProgram(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async launchConservationProgram(id: string, _launchedBy: string): Promise<ConservationProgram | null> {
    return WaterManagementService.updateConservationProgram(id, { status: 'active', startDate: new Date().toISOString() });
  },

  async suspendConservationProgram(id: string, _suspendedBy: string): Promise<ConservationProgram | null> {
    return WaterManagementService.updateConservationProgram(id, { status: 'suspended' });
  },

  async completeConservationProgram(id: string, _completedBy: string): Promise<ConservationProgram | null> {
    return WaterManagementService.updateConservationProgram(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  async archiveConservationProgram(id: string, _archivedBy: string): Promise<ConservationProgram | null> {
    return WaterManagementService.updateConservationProgram(id, { status: 'archived' });
  },

  // ── Metrics & Stats ──

  async getWaterManagementMetrics(organizationId: string): Promise<WaterManagementMetrics> {
    const [meters, readings, tests, programs] = await Promise.all([
      WaterManagementService.listWaterMeters(organizationId),
      WaterManagementService.listWaterReadings(organizationId),
      WaterManagementService.listWaterQualityTests(organizationId),
      WaterManagementService.listConservationPrograms(organizationId),
    ]);
    return {
      activeMeters: meters.filter((m) => m.status === 'active').length,
      pendingReadings: readings.filter((r) => r.status === 'pending' || r.status === 'submitted').length,
      pendingTests: tests.filter((t) => t.status === 'scheduled' || t.status === 'in_progress').length,
      activePrograms: programs.filter((p) => p.status === 'active').length,
      totalConsumption: readings.reduce((sum, r) => sum + (r.consumption ?? 0), 0),
    };
  },

  async getWaterManagementStats(organizationId: string): Promise<WaterManagementStats> {
    const [meters, readings, tests, programs] = await Promise.all([
      WaterManagementService.listWaterMeters(organizationId),
      WaterManagementService.listWaterReadings(organizationId),
      WaterManagementService.listWaterQualityTests(organizationId),
      WaterManagementService.listConservationPrograms(organizationId),
    ]);
    const byMeterType: Record<string, number> = {};
    const byMeterStatus: Record<string, number> = {};
    const byReadingType: Record<string, number> = {};
    const byReadingStatus: Record<string, number> = {};
    const byTestType: Record<string, number> = {};
    const byTestStatus: Record<string, number> = {};
    const byProgramType: Record<string, number> = {};
    const byProgramStatus: Record<string, number> = {};
    for (const m of meters) { byMeterType[m.type] = (byMeterType[m.type] ?? 0) + 1; byMeterStatus[m.status] = (byMeterStatus[m.status] ?? 0) + 1; }
    for (const r of readings) { byReadingType[r.type] = (byReadingType[r.type] ?? 0) + 1; byReadingStatus[r.status] = (byReadingStatus[r.status] ?? 0) + 1; }
    for (const t of tests) { byTestType[t.type] = (byTestType[t.type] ?? 0) + 1; byTestStatus[t.status] = (byTestStatus[t.status] ?? 0) + 1; }
    for (const p of programs) { byProgramType[p.type] = (byProgramType[p.type] ?? 0) + 1; byProgramStatus[p.status] = (byProgramStatus[p.status] ?? 0) + 1; }
    return {
      meterCount: meters.length,
      readingCount: readings.length,
      testCount: tests.length,
      programCount: programs.length,
      byMeterType, byMeterStatus, byReadingType, byReadingStatus, byTestType, byTestStatus, byProgramType, byProgramStatus,
    };
  },
};
