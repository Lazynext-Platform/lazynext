import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type AirSensorType = 'co2' | 'pm25' | 'pm10' | 'voc' | 'temperature' | 'humidity' | 'ozone' | 'nox' | 'multi';
export type AirSensorStatus = 'active' | 'calibrating' | 'maintained' | 'decommissioned' | 'offline' | 'pending';
export type AirReadingType = 'routine' | 'incident' | 'calibration' | 'continuous' | 'manual' | 'automated';
export type AirReadingStatus = 'submitted' | 'verified' | 'flagged' | 'archived' | 'pending';
export type AirThresholdType = 'co2' | 'pm25' | 'pm10' | 'voc' | 'temperature' | 'humidity' | 'ozone' | 'nox';
export type AirThresholdStatus = 'active' | 'suspended' | 'revised';
export type AirAlertType = 'warning' | 'critical' | 'info' | 'breach' | 'maintenance' | 'calibration';
export type AirAlertStatus = 'triggered' | 'acknowledged' | 'resolved' | 'escalated' | 'closed';

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

export interface AirSensor {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: AirSensorType;
  description: string;
  status: AirSensorStatus;
  location: string;
  building: string;
  floor: string;
  zone: string;
  unit: string;
  lastCalibrated: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AirReading {
  id: string;
  organizationId: string;
  workspaceId: string;
  sensorId: string | null;
  type: AirReadingType;
  description: string;
  status: AirReadingStatus;
  parameter: string;
  value: number;
  unit: string;
  threshold: number;
  readingDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AirThreshold {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: AirThresholdType;
  description: string;
  status: AirThresholdStatus;
  parameter: string;
  minValue: number;
  maxValue: number;
  unit: string;
  severity: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AirAlert {
  id: string;
  organizationId: string;
  workspaceId: string;
  sensorId: string | null;
  thresholdId: string | null;
  type: AirAlertType;
  description: string;
  status: AirAlertStatus;
  severity: string;
  triggeredDate: Date | null;
  acknowledgedDate: Date | null;
  resolvedDate: Date | null;
  acknowledgedBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AirQualityManagementMetrics {
  activeSensors: number;
  pendingReadings: number;
  activeThresholds: number;
  activeAlerts: number;
  criticalAlerts: number;
}

export interface AirQualityManagementStats {
  sensorCount: number;
  readingCount: number;
  thresholdCount: number;
  alertCount: number;
  bySensorType: Record<string, number>;
  bySensorStatus: Record<string, number>;
  byReadingType: Record<string, number>;
  byReadingStatus: Record<string, number>;
  byThresholdType: Record<string, number>;
  byThresholdStatus: Record<string, number>;
  byAlertType: Record<string, number>;
  byAlertStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateAirSensorInput {
  name: string;
  type: AirSensorType;
  description?: string;
  status?: AirSensorStatus;
  location?: string;
  building?: string;
  floor?: string;
  zone?: string;
  unit?: string;
  lastCalibrated?: string;
  notes?: string;
}

export interface UpdateAirSensorInput {
  name?: string;
  type?: AirSensorType;
  description?: string;
  status?: AirSensorStatus;
  location?: string;
  building?: string;
  floor?: string;
  zone?: string;
  unit?: string;
  lastCalibrated?: string;
  notes?: string;
}

export interface ListAirSensorsOpts {
  type?: AirSensorType;
  status?: AirSensorStatus;
}

export interface CreateAirReadingInput {
  sensorId?: string;
  type: AirReadingType;
  description?: string;
  status?: AirReadingStatus;
  parameter?: string;
  value?: number;
  unit?: string;
  threshold?: number;
  readingDate?: string;
  notes?: string;
}

export interface UpdateAirReadingInput {
  sensorId?: string;
  type?: AirReadingType;
  description?: string;
  status?: AirReadingStatus;
  parameter?: string;
  value?: number;
  unit?: string;
  threshold?: number;
  readingDate?: string;
  notes?: string;
}

export interface ListAirReadingsOpts {
  sensorId?: string;
  type?: AirReadingType;
  status?: AirReadingStatus;
}

export interface CreateAirThresholdInput {
  name: string;
  type: AirThresholdType;
  description?: string;
  status?: AirThresholdStatus;
  parameter?: string;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  severity?: string;
  notes?: string;
}

export interface UpdateAirThresholdInput {
  name?: string;
  type?: AirThresholdType;
  description?: string;
  status?: AirThresholdStatus;
  parameter?: string;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  severity?: string;
  notes?: string;
}

export interface ListAirThresholdsOpts {
  type?: AirThresholdType;
  status?: AirThresholdStatus;
}

export interface CreateAirAlertInput {
  sensorId?: string;
  thresholdId?: string;
  type: AirAlertType;
  description?: string;
  status?: AirAlertStatus;
  severity?: string;
  triggeredDate?: string;
  acknowledgedDate?: string;
  resolvedDate?: string;
  acknowledgedBy?: string;
  notes?: string;
}

export interface UpdateAirAlertInput {
  sensorId?: string;
  thresholdId?: string;
  type?: AirAlertType;
  description?: string;
  status?: AirAlertStatus;
  severity?: string;
  triggeredDate?: string;
  acknowledgedDate?: string;
  resolvedDate?: string;
  acknowledgedBy?: string;
  notes?: string;
}

export interface ListAirAlertsOpts {
  sensorId?: string;
  thresholdId?: string;
  type?: AirAlertType;
  status?: AirAlertStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toAirSensor(row: MemoryRow): AirSensor {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as AirSensorType) ?? 'co2',
    description: (c.description as string) ?? '',
    status: (c.status as AirSensorStatus) ?? 'pending',
    location: (c.location as string) ?? '',
    building: (c.building as string) ?? '',
    floor: (c.floor as string) ?? '',
    zone: (c.zone as string) ?? '',
    unit: (c.unit as string) ?? '',
    lastCalibrated: c.lastCalibrated ? new Date(c.lastCalibrated as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAirReading(row: MemoryRow): AirReading {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    sensorId: (c.sensorId as string) ?? null,
    type: (c.type as AirReadingType) ?? 'routine',
    description: (c.description as string) ?? '',
    status: (c.status as AirReadingStatus) ?? 'pending',
    parameter: (c.parameter as string) ?? '',
    value: (c.value as number) ?? 0,
    unit: (c.unit as string) ?? '',
    threshold: (c.threshold as number) ?? 0,
    readingDate: c.readingDate ? new Date(c.readingDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAirThreshold(row: MemoryRow): AirThreshold {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as AirThresholdType) ?? 'co2',
    description: (c.description as string) ?? '',
    status: (c.status as AirThresholdStatus) ?? 'active',
    parameter: (c.parameter as string) ?? '',
    minValue: (c.minValue as number) ?? 0,
    maxValue: (c.maxValue as number) ?? 0,
    unit: (c.unit as string) ?? '',
    severity: (c.severity as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAirAlert(row: MemoryRow): AirAlert {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    sensorId: (c.sensorId as string) ?? null,
    thresholdId: (c.thresholdId as string) ?? null,
    type: (c.type as AirAlertType) ?? 'warning',
    description: (c.description as string) ?? '',
    status: (c.status as AirAlertStatus) ?? 'triggered',
    severity: (c.severity as string) ?? '',
    triggeredDate: c.triggeredDate ? new Date(c.triggeredDate as string) : null,
    acknowledgedDate: c.acknowledgedDate ? new Date(c.acknowledgedDate as string) : null,
    resolvedDate: c.resolvedDate ? new Date(c.resolvedDate as string) : null,
    acknowledgedBy: (c.acknowledgedBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const AirQualityManagementService = {
  // ── Air Sensors ──

  async createAirSensor(organizationId: string, workspaceId: string, input: CreateAirSensorInput, createdBy: string): Promise<AirSensor> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      location: input.location ?? '',
      building: input.building ?? '',
      floor: input.floor ?? '',
      zone: input.zone ?? '',
      unit: input.unit ?? '',
      lastCalibrated: input.lastCalibrated ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'air_sensor',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['air_sensor', content.type, content.status]),
        createdBy,
      },
    });
    return toAirSensor(row as MemoryRow);
  },

  async getAirSensor(id: string): Promise<AirSensor | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'air_sensor') return null;
    return toAirSensor(row as MemoryRow);
  },

  async listAirSensors(organizationId: string, opts: ListAirSensorsOpts = {}): Promise<AirSensor[]> {
    const where: Record<string, unknown> = { organizationId, type: 'air_sensor' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAirSensor);
  },

  async updateAirSensor(id: string, input: UpdateAirSensorInput): Promise<AirSensor | null> {
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
      ...(input.floor !== undefined && { floor: input.floor }),
      ...(input.zone !== undefined && { zone: input.zone }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.lastCalibrated !== undefined && { lastCalibrated: input.lastCalibrated }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['air_sensor', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAirSensor(row as MemoryRow);
  },

  async deleteAirSensor(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateAirSensor(id: string, _activatedBy: string): Promise<AirSensor | null> {
    return AirQualityManagementService.updateAirSensor(id, { status: 'active' });
  },

  async calibrateAirSensor(id: string, _calibratedBy: string): Promise<AirSensor | null> {
    return AirQualityManagementService.updateAirSensor(id, { status: 'calibrating', lastCalibrated: new Date().toISOString() });
  },

  async maintainAirSensor(id: string, _maintainedBy: string): Promise<AirSensor | null> {
    return AirQualityManagementService.updateAirSensor(id, { status: 'maintained' });
  },

  async decommissionAirSensor(id: string, _decommissionedBy: string): Promise<AirSensor | null> {
    return AirQualityManagementService.updateAirSensor(id, { status: 'decommissioned' });
  },

  // ── Air Readings ──

  async createAirReading(organizationId: string, workspaceId: string, input: CreateAirReadingInput, createdBy: string): Promise<AirReading> {
    const content = {
      sensorId: input.sensorId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      parameter: input.parameter ?? '',
      value: input.value ?? 0,
      unit: input.unit ?? '',
      threshold: input.threshold ?? 0,
      readingDate: input.readingDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'air_reading',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.sensorId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['air_reading', content.type, content.status]),
        createdBy,
      },
    });
    return toAirReading(row as MemoryRow);
  },

  async getAirReading(id: string): Promise<AirReading | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'air_reading') return null;
    return toAirReading(row as MemoryRow);
  },

  async listAirReadings(organizationId: string, opts: ListAirReadingsOpts = {}): Promise<AirReading[]> {
    const where: Record<string, unknown> = { organizationId, type: 'air_reading' };
    const conditions: unknown[] = [];
    if (opts.sensorId) conditions.push({ content: { contains: `"sensorId":"${opts.sensorId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAirReading);
  },

  async updateAirReading(id: string, input: UpdateAirReadingInput): Promise<AirReading | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.sensorId !== undefined && { sensorId: input.sensorId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.parameter !== undefined && { parameter: input.parameter }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.threshold !== undefined && { threshold: input.threshold }),
      ...(input.readingDate !== undefined && { readingDate: input.readingDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['air_reading', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAirReading(row as MemoryRow);
  },

  async deleteAirReading(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async submitAirReading(id: string, _submittedBy: string): Promise<AirReading | null> {
    return AirQualityManagementService.updateAirReading(id, { status: 'submitted' });
  },

  async verifyAirReading(id: string, _verifiedBy: string): Promise<AirReading | null> {
    return AirQualityManagementService.updateAirReading(id, { status: 'verified' });
  },

  async flagAirReading(id: string, _flaggedBy: string): Promise<AirReading | null> {
    return AirQualityManagementService.updateAirReading(id, { status: 'flagged' });
  },

  async archiveAirReading(id: string, _archivedBy: string): Promise<AirReading | null> {
    return AirQualityManagementService.updateAirReading(id, { status: 'archived' });
  },

  // ── Air Thresholds ──

  async createAirThreshold(organizationId: string, workspaceId: string, input: CreateAirThresholdInput, createdBy: string): Promise<AirThreshold> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      parameter: input.parameter ?? '',
      minValue: input.minValue ?? 0,
      maxValue: input.maxValue ?? 0,
      unit: input.unit ?? '',
      severity: input.severity ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'air_threshold',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['air_threshold', content.type, content.status]),
        createdBy,
      },
    });
    return toAirThreshold(row as MemoryRow);
  },

  async getAirThreshold(id: string): Promise<AirThreshold | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'air_threshold') return null;
    return toAirThreshold(row as MemoryRow);
  },

  async listAirThresholds(organizationId: string, opts: ListAirThresholdsOpts = {}): Promise<AirThreshold[]> {
    const where: Record<string, unknown> = { organizationId, type: 'air_threshold' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAirThreshold);
  },

  async updateAirThreshold(id: string, input: UpdateAirThresholdInput): Promise<AirThreshold | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.parameter !== undefined && { parameter: input.parameter }),
      ...(input.minValue !== undefined && { minValue: input.minValue }),
      ...(input.maxValue !== undefined && { maxValue: input.maxValue }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['air_threshold', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAirThreshold(row as MemoryRow);
  },

  async deleteAirThreshold(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateAirThreshold(id: string, _activatedBy: string): Promise<AirThreshold | null> {
    return AirQualityManagementService.updateAirThreshold(id, { status: 'active' });
  },

  async suspendAirThreshold(id: string, _suspendedBy: string): Promise<AirThreshold | null> {
    return AirQualityManagementService.updateAirThreshold(id, { status: 'suspended' });
  },

  async reviseAirThreshold(id: string, _revisedBy: string): Promise<AirThreshold | null> {
    return AirQualityManagementService.updateAirThreshold(id, { status: 'revised' });
  },

  // ── Air Alerts ──

  async createAirAlert(organizationId: string, workspaceId: string, input: CreateAirAlertInput, createdBy: string): Promise<AirAlert> {
    const content = {
      sensorId: input.sensorId ?? null,
      thresholdId: input.thresholdId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'triggered',
      severity: input.severity ?? '',
      triggeredDate: input.triggeredDate ?? null,
      acknowledgedDate: input.acknowledgedDate ?? null,
      resolvedDate: input.resolvedDate ?? null,
      acknowledgedBy: input.acknowledgedBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'air_alert',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.sensorId ?? input.thresholdId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['air_alert', content.type, content.status]),
        createdBy,
      },
    });
    return toAirAlert(row as MemoryRow);
  },

  async getAirAlert(id: string): Promise<AirAlert | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'air_alert') return null;
    return toAirAlert(row as MemoryRow);
  },

  async listAirAlerts(organizationId: string, opts: ListAirAlertsOpts = {}): Promise<AirAlert[]> {
    const where: Record<string, unknown> = { organizationId, type: 'air_alert' };
    const conditions: unknown[] = [];
    if (opts.sensorId) conditions.push({ content: { contains: `"sensorId":"${opts.sensorId}"` } });
    if (opts.thresholdId) conditions.push({ content: { contains: `"thresholdId":"${opts.thresholdId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAirAlert);
  },

  async updateAirAlert(id: string, input: UpdateAirAlertInput): Promise<AirAlert | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.sensorId !== undefined && { sensorId: input.sensorId }),
      ...(input.thresholdId !== undefined && { thresholdId: input.thresholdId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.triggeredDate !== undefined && { triggeredDate: input.triggeredDate }),
      ...(input.acknowledgedDate !== undefined && { acknowledgedDate: input.acknowledgedDate }),
      ...(input.resolvedDate !== undefined && { resolvedDate: input.resolvedDate }),
      ...(input.acknowledgedBy !== undefined && { acknowledgedBy: input.acknowledgedBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['air_alert', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAirAlert(row as MemoryRow);
  },

  async deleteAirAlert(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async triggerAirAlert(id: string, _triggeredBy: string): Promise<AirAlert | null> {
    return AirQualityManagementService.updateAirAlert(id, { status: 'triggered', triggeredDate: new Date().toISOString() });
  },

  async acknowledgeAirAlert(id: string, _acknowledgedBy: string): Promise<AirAlert | null> {
    return AirQualityManagementService.updateAirAlert(id, { status: 'acknowledged', acknowledgedDate: new Date().toISOString(), acknowledgedBy: _acknowledgedBy });
  },

  async resolveAirAlert(id: string, _resolvedBy: string): Promise<AirAlert | null> {
    return AirQualityManagementService.updateAirAlert(id, { status: 'resolved', resolvedDate: new Date().toISOString() });
  },

  async escalateAirAlert(id: string, _escalatedBy: string): Promise<AirAlert | null> {
    return AirQualityManagementService.updateAirAlert(id, { status: 'escalated' });
  },

  async closeAirAlert(id: string, _closedBy: string): Promise<AirAlert | null> {
    return AirQualityManagementService.updateAirAlert(id, { status: 'closed' });
  },

  // ── Metrics & Stats ──

  async getAirQualityManagementMetrics(organizationId: string): Promise<AirQualityManagementMetrics> {
    const [sensors, readings, thresholds, alerts] = await Promise.all([
      AirQualityManagementService.listAirSensors(organizationId),
      AirQualityManagementService.listAirReadings(organizationId),
      AirQualityManagementService.listAirThresholds(organizationId),
      AirQualityManagementService.listAirAlerts(organizationId),
    ]);
    return {
      activeSensors: sensors.filter((s) => s.status === 'active').length,
      pendingReadings: readings.filter((r) => r.status === 'pending' || r.status === 'submitted').length,
      activeThresholds: thresholds.filter((t) => t.status === 'active').length,
      activeAlerts: alerts.filter((a) => a.status === 'triggered' || a.status === 'acknowledged' || a.status === 'escalated').length,
      criticalAlerts: alerts.filter((a) => a.type === 'critical' && a.status !== 'closed' && a.status !== 'resolved').length,
    };
  },

  async getAirQualityManagementStats(organizationId: string): Promise<AirQualityManagementStats> {
    const [sensors, readings, thresholds, alerts] = await Promise.all([
      AirQualityManagementService.listAirSensors(organizationId),
      AirQualityManagementService.listAirReadings(organizationId),
      AirQualityManagementService.listAirThresholds(organizationId),
      AirQualityManagementService.listAirAlerts(organizationId),
    ]);
    const bySensorType: Record<string, number> = {};
    const bySensorStatus: Record<string, number> = {};
    const byReadingType: Record<string, number> = {};
    const byReadingStatus: Record<string, number> = {};
    const byThresholdType: Record<string, number> = {};
    const byThresholdStatus: Record<string, number> = {};
    const byAlertType: Record<string, number> = {};
    const byAlertStatus: Record<string, number> = {};
    for (const s of sensors) { bySensorType[s.type] = (bySensorType[s.type] ?? 0) + 1; bySensorStatus[s.status] = (bySensorStatus[s.status] ?? 0) + 1; }
    for (const r of readings) { byReadingType[r.type] = (byReadingType[r.type] ?? 0) + 1; byReadingStatus[r.status] = (byReadingStatus[r.status] ?? 0) + 1; }
    for (const t of thresholds) { byThresholdType[t.type] = (byThresholdType[t.type] ?? 0) + 1; byThresholdStatus[t.status] = (byThresholdStatus[t.status] ?? 0) + 1; }
    for (const a of alerts) { byAlertType[a.type] = (byAlertType[a.type] ?? 0) + 1; byAlertStatus[a.status] = (byAlertStatus[a.status] ?? 0) + 1; }
    return {
      sensorCount: sensors.length,
      readingCount: readings.length,
      thresholdCount: thresholds.length,
      alertCount: alerts.length,
      bySensorType, bySensorStatus, byReadingType, byReadingStatus, byThresholdType, byThresholdStatus, byAlertType, byAlertStatus,
    };
  },
};
