import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type EnergyMeterType = 'electric' | 'gas' | 'solar' | 'wind' | 'thermal' | 'backup' | 'sub_meter' | 'smart';
export type EnergyMeterStatus = 'active' | 'maintained' | 'calibrating' | 'decommissioned' | 'offline' | 'pending';
export type EnergyReadingType = 'consumption' | 'generation' | 'demand' | 'peak' | 'off_peak' | 'estimated';
export type EnergyReadingStatus = 'submitted' | 'verified' | 'flagged' | 'archived' | 'pending';
export type EfficiencyTargetType = 'reduction' | 'efficiency' | 'renewable' | 'cost' | 'emission' | 'benchmark';
export type EfficiencyTargetStatus = 'set' | 'approved' | 'achieved' | 'missed' | 'under_review';
export type EnergyTariffType = 'fixed' | 'variable' | 'time_of_use' | 'tiered' | 'demand' | 'renewable';
export type EnergyTariffStatus = 'active' | 'suspended' | 'expired' | 'renewed' | 'pending';

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

export interface EnergyMeter {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: EnergyMeterType;
  description: string;
  status: EnergyMeterStatus;
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

export interface EnergyReading {
  id: string;
  organizationId: string;
  workspaceId: string;
  meterId: string | null;
  type: EnergyReadingType;
  description: string;
  status: EnergyReadingStatus;
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

export interface EfficiencyTarget {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: EfficiencyTargetType;
  description: string;
  status: EfficiencyTargetStatus;
  targetValue: number;
  actualValue: number;
  unit: string;
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnergyTariff {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: EnergyTariffType;
  description: string;
  status: EnergyTariffStatus;
  provider: string;
  rate: number;
  unit: string;
  startDate: Date | null;
  endDate: Date | null;
  contractTerms: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnergyManagementMetrics {
  activeMeters: number;
  pendingReadings: number;
  activeTargets: number;
  activeTariffs: number;
  totalConsumption: number;
}

export interface EnergyManagementStats {
  meterCount: number;
  readingCount: number;
  targetCount: number;
  tariffCount: number;
  byMeterType: Record<string, number>;
  byMeterStatus: Record<string, number>;
  byReadingType: Record<string, number>;
  byReadingStatus: Record<string, number>;
  byTargetType: Record<string, number>;
  byTargetStatus: Record<string, number>;
  byTariffType: Record<string, number>;
  byTariffStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateEnergyMeterInput {
  name: string;
  type: EnergyMeterType;
  description?: string;
  status?: EnergyMeterStatus;
  location?: string;
  building?: string;
  unit?: string;
  capacity?: number;
  lastCalibrated?: string;
  notes?: string;
}

export interface UpdateEnergyMeterInput {
  name?: string;
  type?: EnergyMeterType;
  description?: string;
  status?: EnergyMeterStatus;
  location?: string;
  building?: string;
  unit?: string;
  capacity?: number;
  lastCalibrated?: string;
  notes?: string;
}

export interface ListEnergyMetersOpts {
  type?: EnergyMeterType;
  status?: EnergyMeterStatus;
}

export interface CreateEnergyReadingInput {
  meterId?: string;
  type: EnergyReadingType;
  description?: string;
  status?: EnergyReadingStatus;
  value?: number;
  unit?: string;
  readingDate?: string;
  previousValue?: number;
  consumption?: number;
  cost?: number;
  notes?: string;
}

export interface UpdateEnergyReadingInput {
  meterId?: string;
  type?: EnergyReadingType;
  description?: string;
  status?: EnergyReadingStatus;
  value?: number;
  unit?: string;
  readingDate?: string;
  previousValue?: number;
  consumption?: number;
  cost?: number;
  notes?: string;
}

export interface ListEnergyReadingsOpts {
  meterId?: string;
  type?: EnergyReadingType;
  status?: EnergyReadingStatus;
}

export interface CreateEfficiencyTargetInput {
  name: string;
  type: EfficiencyTargetType;
  description?: string;
  status?: EfficiencyTargetStatus;
  targetValue?: number;
  actualValue?: number;
  unit?: string;
  startDate?: string;
  endDate?: string;
  progress?: number;
  notes?: string;
}

export interface UpdateEfficiencyTargetInput {
  name?: string;
  type?: EfficiencyTargetType;
  description?: string;
  status?: EfficiencyTargetStatus;
  targetValue?: number;
  actualValue?: number;
  unit?: string;
  startDate?: string;
  endDate?: string;
  progress?: number;
  notes?: string;
}

export interface ListEfficiencyTargetsOpts {
  type?: EfficiencyTargetType;
  status?: EfficiencyTargetStatus;
}

export interface CreateEnergyTariffInput {
  name: string;
  type: EnergyTariffType;
  description?: string;
  status?: EnergyTariffStatus;
  provider?: string;
  rate?: number;
  unit?: string;
  startDate?: string;
  endDate?: string;
  contractTerms?: string;
  notes?: string;
}

export interface UpdateEnergyTariffInput {
  name?: string;
  type?: EnergyTariffType;
  description?: string;
  status?: EnergyTariffStatus;
  provider?: string;
  rate?: number;
  unit?: string;
  startDate?: string;
  endDate?: string;
  contractTerms?: string;
  notes?: string;
}

export interface ListEnergyTariffsOpts {
  type?: EnergyTariffType;
  status?: EnergyTariffStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toEnergyMeter(row: MemoryRow): EnergyMeter {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as EnergyMeterType) ?? 'electric',
    description: (c.description as string) ?? '',
    status: (c.status as EnergyMeterStatus) ?? 'pending',
    location: (c.location as string) ?? '',
    building: (c.building as string) ?? '',
    unit: (c.unit as string) ?? '',
    capacity: (c.capacity as number) ?? 0,
    lastCalibrated: c.lastCalibrated ? new Date(c.lastCalibrated as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEnergyReading(row: MemoryRow): EnergyReading {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    meterId: (c.meterId as string) ?? null,
    type: (c.type as EnergyReadingType) ?? 'consumption',
    description: (c.description as string) ?? '',
    status: (c.status as EnergyReadingStatus) ?? 'pending',
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

function toEfficiencyTarget(row: MemoryRow): EfficiencyTarget {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as EfficiencyTargetType) ?? 'reduction',
    description: (c.description as string) ?? '',
    status: (c.status as EfficiencyTargetStatus) ?? 'set',
    targetValue: (c.targetValue as number) ?? 0,
    actualValue: (c.actualValue as number) ?? 0,
    unit: (c.unit as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    progress: (c.progress as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEnergyTariff(row: MemoryRow): EnergyTariff {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as EnergyTariffType) ?? 'fixed',
    description: (c.description as string) ?? '',
    status: (c.status as EnergyTariffStatus) ?? 'pending',
    provider: (c.provider as string) ?? '',
    rate: (c.rate as number) ?? 0,
    unit: (c.unit as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    contractTerms: (c.contractTerms as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const EnergyManagementService = {
  // ── Energy Meters ──

  async createEnergyMeter(organizationId: string, workspaceId: string, input: CreateEnergyMeterInput, createdBy: string): Promise<EnergyMeter> {
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
        workspaceId, organizationId, type: 'energy_meter',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['energy_meter', content.type, content.status]),
        createdBy,
      },
    });
    return toEnergyMeter(row as MemoryRow);
  },

  async getEnergyMeter(id: string): Promise<EnergyMeter | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'energy_meter') return null;
    return toEnergyMeter(row as MemoryRow);
  },

  async listEnergyMeters(organizationId: string, opts: ListEnergyMetersOpts = {}): Promise<EnergyMeter[]> {
    const where: Record<string, unknown> = { organizationId, type: 'energy_meter' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEnergyMeter);
  },

  async updateEnergyMeter(id: string, input: UpdateEnergyMeterInput): Promise<EnergyMeter | null> {
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
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['energy_meter', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toEnergyMeter(row as MemoryRow);
  },

  async deleteEnergyMeter(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateEnergyMeter(id: string, _activatedBy: string): Promise<EnergyMeter | null> {
    return EnergyManagementService.updateEnergyMeter(id, { status: 'active' });
  },

  async maintainEnergyMeter(id: string, _maintainedBy: string): Promise<EnergyMeter | null> {
    return EnergyManagementService.updateEnergyMeter(id, { status: 'maintained' });
  },

  async calibrateEnergyMeter(id: string, _calibratedBy: string): Promise<EnergyMeter | null> {
    return EnergyManagementService.updateEnergyMeter(id, { status: 'calibrating', lastCalibrated: new Date().toISOString() });
  },

  async decommissionEnergyMeter(id: string, _decommissionedBy: string): Promise<EnergyMeter | null> {
    return EnergyManagementService.updateEnergyMeter(id, { status: 'decommissioned' });
  },

  // ── Energy Readings ──

  async createEnergyReading(organizationId: string, workspaceId: string, input: CreateEnergyReadingInput, createdBy: string): Promise<EnergyReading> {
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
        workspaceId, organizationId, type: 'energy_reading',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.meterId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['energy_reading', content.type, content.status]),
        createdBy,
      },
    });
    return toEnergyReading(row as MemoryRow);
  },

  async getEnergyReading(id: string): Promise<EnergyReading | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'energy_reading') return null;
    return toEnergyReading(row as MemoryRow);
  },

  async listEnergyReadings(organizationId: string, opts: ListEnergyReadingsOpts = {}): Promise<EnergyReading[]> {
    const where: Record<string, unknown> = { organizationId, type: 'energy_reading' };
    const conditions: unknown[] = [];
    if (opts.meterId) conditions.push({ content: { contains: `"meterId":"${opts.meterId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEnergyReading);
  },

  async updateEnergyReading(id: string, input: UpdateEnergyReadingInput): Promise<EnergyReading | null> {
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
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['energy_reading', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toEnergyReading(row as MemoryRow);
  },

  async deleteEnergyReading(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async submitEnergyReading(id: string, _submittedBy: string): Promise<EnergyReading | null> {
    return EnergyManagementService.updateEnergyReading(id, { status: 'submitted' });
  },

  async verifyEnergyReading(id: string, _verifiedBy: string): Promise<EnergyReading | null> {
    return EnergyManagementService.updateEnergyReading(id, { status: 'verified' });
  },

  async flagEnergyReading(id: string, _flaggedBy: string): Promise<EnergyReading | null> {
    return EnergyManagementService.updateEnergyReading(id, { status: 'flagged' });
  },

  async archiveEnergyReading(id: string, _archivedBy: string): Promise<EnergyReading | null> {
    return EnergyManagementService.updateEnergyReading(id, { status: 'archived' });
  },

  // ── Efficiency Targets ──

  async createEfficiencyTarget(organizationId: string, workspaceId: string, input: CreateEfficiencyTargetInput, createdBy: string): Promise<EfficiencyTarget> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'set',
      targetValue: input.targetValue ?? 0,
      actualValue: input.actualValue ?? 0,
      unit: input.unit ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      progress: input.progress ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'efficiency_target',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['efficiency_target', content.type, content.status]),
        createdBy,
      },
    });
    return toEfficiencyTarget(row as MemoryRow);
  },

  async getEfficiencyTarget(id: string): Promise<EfficiencyTarget | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'efficiency_target') return null;
    return toEfficiencyTarget(row as MemoryRow);
  },

  async listEfficiencyTargets(organizationId: string, opts: ListEfficiencyTargetsOpts = {}): Promise<EfficiencyTarget[]> {
    const where: Record<string, unknown> = { organizationId, type: 'efficiency_target' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEfficiencyTarget);
  },

  async updateEfficiencyTarget(id: string, input: UpdateEfficiencyTargetInput): Promise<EfficiencyTarget | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.targetValue !== undefined && { targetValue: input.targetValue }),
      ...(input.actualValue !== undefined && { actualValue: input.actualValue }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['efficiency_target', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toEfficiencyTarget(row as MemoryRow);
  },

  async deleteEfficiencyTarget(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async setEfficiencyTarget(id: string, _setBy: string): Promise<EfficiencyTarget | null> {
    return EnergyManagementService.updateEfficiencyTarget(id, { status: 'set' });
  },

  async approveEfficiencyTarget(id: string, _approvedBy: string): Promise<EfficiencyTarget | null> {
    return EnergyManagementService.updateEfficiencyTarget(id, { status: 'approved', startDate: new Date().toISOString() });
  },

  async achieveEfficiencyTarget(id: string, _achievedBy: string): Promise<EfficiencyTarget | null> {
    return EnergyManagementService.updateEfficiencyTarget(id, { status: 'achieved', endDate: new Date().toISOString() });
  },

  async missEfficiencyTarget(id: string, _missedBy: string): Promise<EfficiencyTarget | null> {
    return EnergyManagementService.updateEfficiencyTarget(id, { status: 'missed', endDate: new Date().toISOString() });
  },

  async reviewEfficiencyTarget(id: string, _reviewedBy: string): Promise<EfficiencyTarget | null> {
    return EnergyManagementService.updateEfficiencyTarget(id, { status: 'under_review' });
  },

  // ── Energy Tariffs ──

  async createEnergyTariff(organizationId: string, workspaceId: string, input: CreateEnergyTariffInput, createdBy: string): Promise<EnergyTariff> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      provider: input.provider ?? '',
      rate: input.rate ?? 0,
      unit: input.unit ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      contractTerms: input.contractTerms ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'energy_tariff',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['energy_tariff', content.type, content.status]),
        createdBy,
      },
    });
    return toEnergyTariff(row as MemoryRow);
  },

  async getEnergyTariff(id: string): Promise<EnergyTariff | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'energy_tariff') return null;
    return toEnergyTariff(row as MemoryRow);
  },

  async listEnergyTariffs(organizationId: string, opts: ListEnergyTariffsOpts = {}): Promise<EnergyTariff[]> {
    const where: Record<string, unknown> = { organizationId, type: 'energy_tariff' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEnergyTariff);
  },

  async updateEnergyTariff(id: string, input: UpdateEnergyTariffInput): Promise<EnergyTariff | null> {
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
      ...(input.rate !== undefined && { rate: input.rate }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.contractTerms !== undefined && { contractTerms: input.contractTerms }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['energy_tariff', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toEnergyTariff(row as MemoryRow);
  },

  async deleteEnergyTariff(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateEnergyTariff(id: string, _activatedBy: string): Promise<EnergyTariff | null> {
    return EnergyManagementService.updateEnergyTariff(id, { status: 'active', startDate: new Date().toISOString() });
  },

  async suspendEnergyTariff(id: string, _suspendedBy: string): Promise<EnergyTariff | null> {
    return EnergyManagementService.updateEnergyTariff(id, { status: 'suspended' });
  },

  async expireEnergyTariff(id: string, _expiredBy: string): Promise<EnergyTariff | null> {
    return EnergyManagementService.updateEnergyTariff(id, { status: 'expired', endDate: new Date().toISOString() });
  },

  async renewEnergyTariff(id: string, _renewedBy: string): Promise<EnergyTariff | null> {
    return EnergyManagementService.updateEnergyTariff(id, { status: 'renewed', startDate: new Date().toISOString() });
  },

  // ── Metrics & Stats ──

  async getEnergyManagementMetrics(organizationId: string): Promise<EnergyManagementMetrics> {
    const [meters, readings, targets, tariffs] = await Promise.all([
      EnergyManagementService.listEnergyMeters(organizationId),
      EnergyManagementService.listEnergyReadings(organizationId),
      EnergyManagementService.listEfficiencyTargets(organizationId),
      EnergyManagementService.listEnergyTariffs(organizationId),
    ]);
    return {
      activeMeters: meters.filter((m) => m.status === 'active').length,
      pendingReadings: readings.filter((r) => r.status === 'pending' || r.status === 'submitted').length,
      activeTargets: targets.filter((t) => t.status === 'approved').length,
      activeTariffs: tariffs.filter((t) => t.status === 'active').length,
      totalConsumption: readings.reduce((sum, r) => sum + (r.consumption ?? 0), 0),
    };
  },

  async getEnergyManagementStats(organizationId: string): Promise<EnergyManagementStats> {
    const [meters, readings, targets, tariffs] = await Promise.all([
      EnergyManagementService.listEnergyMeters(organizationId),
      EnergyManagementService.listEnergyReadings(organizationId),
      EnergyManagementService.listEfficiencyTargets(organizationId),
      EnergyManagementService.listEnergyTariffs(organizationId),
    ]);
    const byMeterType: Record<string, number> = {};
    const byMeterStatus: Record<string, number> = {};
    const byReadingType: Record<string, number> = {};
    const byReadingStatus: Record<string, number> = {};
    const byTargetType: Record<string, number> = {};
    const byTargetStatus: Record<string, number> = {};
    const byTariffType: Record<string, number> = {};
    const byTariffStatus: Record<string, number> = {};
    for (const m of meters) { byMeterType[m.type] = (byMeterType[m.type] ?? 0) + 1; byMeterStatus[m.status] = (byMeterStatus[m.status] ?? 0) + 1; }
    for (const r of readings) { byReadingType[r.type] = (byReadingType[r.type] ?? 0) + 1; byReadingStatus[r.status] = (byReadingStatus[r.status] ?? 0) + 1; }
    for (const t of targets) { byTargetType[t.type] = (byTargetType[t.type] ?? 0) + 1; byTargetStatus[t.status] = (byTargetStatus[t.status] ?? 0) + 1; }
    for (const t of tariffs) { byTariffType[t.type] = (byTariffType[t.type] ?? 0) + 1; byTariffStatus[t.status] = (byTariffStatus[t.status] ?? 0) + 1; }
    return {
      meterCount: meters.length,
      readingCount: readings.length,
      targetCount: targets.length,
      tariffCount: tariffs.length,
      byMeterType, byMeterStatus, byReadingType, byReadingStatus, byTargetType, byTargetStatus, byTariffType, byTariffStatus,
    };
  },
};
