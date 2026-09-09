import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type IncidentType = 'injury' | 'near_miss' | 'property_damage' | 'environmental' | 'security' | 'other';
export type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'fatal';
export type IncidentStatus = 'reported' | 'investigating' | 'actioned' | 'closed';
export type InspectionItemStatus = 'pass' | 'fail' | 'na';
export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type TrainingStatus = 'active' | 'inactive' | 'archived';
export type HazardCategory = 'physical' | 'chemical' | 'biological' | 'ergonomic' | 'psychosocial' | 'safety' | 'environmental';
export type HazardRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type HazardStatus = 'open' | 'mitigating' | 'mitigated' | 'closed';
export type ObservationBehavior = 'safe' | 'unsafe';
export type ObservationStatus = 'open' | 'reviewed' | 'actioned';

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

interface IncidentContent {
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  location: string;
  occurredAt: string;
  reportedBy: string;
  involvedPersons: string[];
  rootCause: string;
  correctiveActions: string[];
  status: IncidentStatus;
  resolution: string;
  investigatedBy: string;
  investigatedAt: string | null;
  closedBy: string;
  closedAt: string | null;
}

interface InspectionItem {
  name: string;
  status: InspectionItemStatus;
  notes: string;
}

interface InspectionContent {
  title: string;
  area: string;
  inspector: string;
  date: string;
  items: InspectionItem[];
  status: InspectionStatus;
  passRate: number;
  passedCount: number;
  failedCount: number;
  naCount: number;
  totalCount: number;
  results: string;
}

interface TrainingContent {
  name: string;
  description: string;
  category: string;
  requiredFor: string[];
  durationHours: number | null;
  frequencyMonths: number | null;
  provider: string;
  certification: string;
  status: TrainingStatus;
}

interface HazardContent {
  title: string;
  description: string;
  category: HazardCategory;
  location: string;
  riskLevel: HazardRiskLevel;
  identifiedBy: string;
  identifiedDate: string;
  mitigation: string;
  status: HazardStatus;
  mitigatedBy: string;
  mitigatedAt: string | null;
}

interface ObservationContent {
  observer: string;
  date: string;
  location: string;
  behavior: ObservationBehavior;
  description: string;
  category: string;
  feedback: string;
  status: ObservationStatus;
}

// ── Public interfaces ──

export interface HSIncident {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  location: string;
  occurredAt: Date;
  reportedBy: string;
  involvedPersons: string[];
  rootCause: string;
  correctiveActions: string[];
  status: IncidentStatus;
  resolution: string;
  investigatedBy: string;
  investigatedAt: Date | null;
  closedBy: string;
  closedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HSInspection {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  area: string;
  inspector: string;
  date: Date;
  items: InspectionItem[];
  status: InspectionStatus;
  passRate: number;
  passedCount: number;
  failedCount: number;
  naCount: number;
  totalCount: number;
  results: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HSTraining {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  category: string;
  requiredFor: string[];
  durationHours: number | null;
  frequencyMonths: number | null;
  provider: string;
  certification: string;
  status: TrainingStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HSHazard {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  category: HazardCategory;
  location: string;
  riskLevel: HazardRiskLevel;
  identifiedBy: string;
  identifiedDate: Date;
  mitigation: string;
  status: HazardStatus;
  mitigatedBy: string;
  mitigatedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HSObservation {
  id: string;
  organizationId: string;
  workspaceId: string;
  observer: string;
  date: Date;
  location: string;
  behavior: ObservationBehavior;
  description: string;
  category: string;
  feedback: string;
  status: ObservationStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyMetrics {
  trir: number;
  totalIncidents: number;
  recordableIncidents: number;
  openHazardsByRiskLevel: Record<string, number>;
  inspectionPassRate: number;
  totalInspections: number;
  trainingCompliance: number;
  totalTrainings: number;
  activeTrainings: number;
  observationsSafe: number;
  observationsUnsafe: number;
  totalObservations: number;
}

export interface SafetyStats {
  incidentCount: number;
  openIncidentCount: number;
  inspectionCount: number;
  completedInspectionCount: number;
  trainingCount: number;
  activeTrainingCount: number;
  hazardCount: number;
  openHazardCount: number;
  observationCount: number;
  trir: number;
  inspectionPassRate: number;
  byIncidentType: Record<string, number>;
  byIncidentSeverity: Record<string, number>;
  byIncidentStatus: Record<string, number>;
  byHazardRiskLevel: Record<string, number>;
  byHazardStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateIncidentInput {
  title: string;
  description?: string;
  type: IncidentType;
  severity: IncidentSeverity;
  location?: string;
  occurredAt: string;
  reportedBy?: string;
  involvedPersons?: string[];
  rootCause?: string;
  correctiveActions?: string[];
  status?: IncidentStatus;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  type?: IncidentType;
  severity?: IncidentSeverity;
  location?: string;
  occurredAt?: string;
  reportedBy?: string;
  involvedPersons?: string[];
  status?: IncidentStatus;
}

export interface ListIncidentsOpts {
  type?: IncidentType;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  location?: string;
}

export interface InspectionItemInput {
  name: string;
  status: InspectionItemStatus;
  notes?: string;
}

export interface CreateInspectionInput {
  title: string;
  area: string;
  inspector: string;
  date: string;
  items: InspectionItemInput[];
  status?: InspectionStatus;
}

export interface UpdateInspectionInput {
  title?: string;
  area?: string;
  inspector?: string;
  date?: string;
  items?: InspectionItemInput[];
  status?: InspectionStatus;
}

export interface ListInspectionsOpts {
  area?: string;
  status?: InspectionStatus;
  inspector?: string;
}

export interface CreateTrainingInput {
  name: string;
  description?: string;
  category?: string;
  requiredFor?: string[];
  durationHours?: number;
  frequencyMonths?: number;
  provider?: string;
  certification?: string;
  status?: TrainingStatus;
}

export interface UpdateTrainingInput {
  name?: string;
  description?: string;
  category?: string;
  requiredFor?: string[];
  durationHours?: number;
  frequencyMonths?: number;
  provider?: string;
  certification?: string;
  status?: TrainingStatus;
}

export interface ListTrainingsOpts {
  category?: string;
  status?: TrainingStatus;
}

export interface CreateHazardInput {
  title: string;
  description?: string;
  category: HazardCategory;
  location?: string;
  riskLevel: HazardRiskLevel;
  identifiedBy?: string;
  identifiedDate?: string;
  mitigation?: string;
  status?: HazardStatus;
}

export interface UpdateHazardInput {
  title?: string;
  description?: string;
  category?: HazardCategory;
  location?: string;
  riskLevel?: HazardRiskLevel;
  identifiedBy?: string;
  identifiedDate?: string;
  status?: HazardStatus;
}

export interface ListHazardsOpts {
  category?: HazardCategory;
  riskLevel?: HazardRiskLevel;
  status?: HazardStatus;
  location?: string;
}

export interface CreateObservationInput {
  observer: string;
  date: string;
  location: string;
  behavior: ObservationBehavior;
  description?: string;
  category?: string;
  feedback?: string;
  status?: ObservationStatus;
}

export interface UpdateObservationInput {
  observer?: string;
  date?: string;
  location?: string;
  behavior?: ObservationBehavior;
  description?: string;
  category?: string;
  feedback?: string;
  status?: ObservationStatus;
}

export interface ListObservationsOpts {
  behavior?: ObservationBehavior;
  location?: string;
}

// ── Helpers ──

const fallbackIncident: IncidentContent = {
  title: '', description: '', type: 'other', severity: 'minor', location: '', occurredAt: '',
  reportedBy: '', involvedPersons: [], rootCause: '', correctiveActions: [], status: 'reported',
  resolution: '', investigatedBy: '', investigatedAt: null, closedBy: '', closedAt: null,
};

const fallbackInspection: InspectionContent = {
  title: '', area: '', inspector: '', date: '', items: [], status: 'scheduled',
  passRate: 0, passedCount: 0, failedCount: 0, naCount: 0, totalCount: 0, results: '',
};

const fallbackTraining: TrainingContent = {
  name: '', description: '', category: '', requiredFor: [], durationHours: null,
  frequencyMonths: null, provider: '', certification: '', status: 'active',
};

const fallbackHazard: HazardContent = {
  title: '', description: '', category: 'safety', location: '', riskLevel: 'low',
  identifiedBy: '', identifiedDate: '', mitigation: '', status: 'open',
  mitigatedBy: '', mitigatedAt: null,
};

const fallbackObservation: ObservationContent = {
  observer: '', date: '', location: '', behavior: 'safe', description: '',
  category: '', feedback: '', status: 'open',
};

function parseIncident(raw: string): IncidentContent {
  if (!raw) return fallbackIncident;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      description: p.description ?? '',
      type: (p.type as IncidentType) ?? 'other',
      severity: (p.severity as IncidentSeverity) ?? 'minor',
      location: p.location ?? '',
      occurredAt: p.occurredAt ?? '',
      reportedBy: p.reportedBy ?? '',
      involvedPersons: Array.isArray(p.involvedPersons) ? p.involvedPersons : [],
      rootCause: p.rootCause ?? '',
      correctiveActions: Array.isArray(p.correctiveActions) ? p.correctiveActions : [],
      status: (p.status as IncidentStatus) ?? 'reported',
      resolution: p.resolution ?? '',
      investigatedBy: p.investigatedBy ?? '',
      investigatedAt: p.investigatedAt ?? null,
      closedBy: p.closedBy ?? '',
      closedAt: p.closedAt ?? null,
    };
  } catch { return fallbackIncident; }
}

function parseInspection(raw: string): InspectionContent {
  if (!raw) return fallbackInspection;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      area: p.area ?? '',
      inspector: p.inspector ?? '',
      date: p.date ?? '',
      items: Array.isArray(p.items) ? p.items : [],
      status: (p.status as InspectionStatus) ?? 'scheduled',
      passRate: typeof p.passRate === 'number' ? p.passRate : 0,
      passedCount: typeof p.passedCount === 'number' ? p.passedCount : 0,
      failedCount: typeof p.failedCount === 'number' ? p.failedCount : 0,
      naCount: typeof p.naCount === 'number' ? p.naCount : 0,
      totalCount: typeof p.totalCount === 'number' ? p.totalCount : 0,
      results: p.results ?? '',
    };
  } catch { return fallbackInspection; }
}

function parseTraining(raw: string): TrainingContent {
  if (!raw) return fallbackTraining;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      description: p.description ?? '',
      category: p.category ?? '',
      requiredFor: Array.isArray(p.requiredFor) ? p.requiredFor : [],
      durationHours: p.durationHours ?? null,
      frequencyMonths: p.frequencyMonths ?? null,
      provider: p.provider ?? '',
      certification: p.certification ?? '',
      status: (p.status as TrainingStatus) ?? 'active',
    };
  } catch { return fallbackTraining; }
}

function parseHazard(raw: string): HazardContent {
  if (!raw) return fallbackHazard;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      description: p.description ?? '',
      category: (p.category as HazardCategory) ?? 'safety',
      location: p.location ?? '',
      riskLevel: (p.riskLevel as HazardRiskLevel) ?? 'low',
      identifiedBy: p.identifiedBy ?? '',
      identifiedDate: p.identifiedDate ?? '',
      mitigation: p.mitigation ?? '',
      status: (p.status as HazardStatus) ?? 'open',
      mitigatedBy: p.mitigatedBy ?? '',
      mitigatedAt: p.mitigatedAt ?? null,
    };
  } catch { return fallbackHazard; }
}

function parseObservation(raw: string): ObservationContent {
  if (!raw) return fallbackObservation;
  try {
    const p = JSON.parse(raw);
    return {
      observer: p.observer ?? '',
      date: p.date ?? '',
      location: p.location ?? '',
      behavior: (p.behavior as ObservationBehavior) ?? 'safe',
      description: p.description ?? '',
      category: p.category ?? '',
      feedback: p.feedback ?? '',
      status: (p.status as ObservationStatus) ?? 'open',
    };
  } catch { return fallbackObservation; }
}

function toIncident(row: MemoryRow): HSIncident {
  const c = parseIncident(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, description: c.description, type: c.type, severity: c.severity,
    location: c.location, occurredAt: c.occurredAt ? new Date(c.occurredAt) : row.createdAt,
    reportedBy: c.reportedBy, involvedPersons: c.involvedPersons, rootCause: c.rootCause,
    correctiveActions: c.correctiveActions, status: c.status, resolution: c.resolution,
    investigatedBy: c.investigatedBy, investigatedAt: c.investigatedAt ? new Date(c.investigatedAt) : null,
    closedBy: c.closedBy, closedAt: c.closedAt ? new Date(c.closedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toInspection(row: MemoryRow): HSInspection {
  const c = parseInspection(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, area: c.area, inspector: c.inspector,
    date: c.date ? new Date(c.date) : row.createdAt, items: c.items, status: c.status,
    passRate: c.passRate, passedCount: c.passedCount, failedCount: c.failedCount,
    naCount: c.naCount, totalCount: c.totalCount, results: c.results,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTraining(row: MemoryRow): HSTraining {
  const c = parseTraining(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, description: c.description, category: c.category, requiredFor: c.requiredFor,
    durationHours: c.durationHours, frequencyMonths: c.frequencyMonths, provider: c.provider,
    certification: c.certification, status: c.status,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toHazard(row: MemoryRow): HSHazard {
  const c = parseHazard(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, description: c.description, category: c.category, location: c.location,
    riskLevel: c.riskLevel, identifiedBy: c.identifiedBy,
    identifiedDate: c.identifiedDate ? new Date(c.identifiedDate) : row.createdAt,
    mitigation: c.mitigation, status: c.status, mitigatedBy: c.mitigatedBy,
    mitigatedAt: c.mitigatedAt ? new Date(c.mitigatedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toObservation(row: MemoryRow): HSObservation {
  const c = parseObservation(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    observer: c.observer, date: c.date ? new Date(c.date) : row.createdAt,
    location: c.location, behavior: c.behavior, description: c.description,
    category: c.category, feedback: c.feedback, status: c.status,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function computeInspectionStats(items: InspectionItemInput[]): { passRate: number; passedCount: number; failedCount: number; naCount: number; totalCount: number } {
  const totalCount = items.length;
  const passedCount = items.filter((i) => i.status === 'pass').length;
  const failedCount = items.filter((i) => i.status === 'fail').length;
  const naCount = items.filter((i) => i.status === 'na').length;
  const graded = passedCount + failedCount;
  const passRate = graded > 0 ? Math.round((passedCount / graded) * 100) : (totalCount > 0 ? 100 : 0);
  return { passRate, passedCount, failedCount, naCount, totalCount };
}

// ── Health & Safety Service ──

export const HealthSafetyService = {
  // ── Incidents ──

  async createIncident(
    organizationId: string,
    workspaceId: string,
    input: CreateIncidentInput,
    createdBy: string,
  ): Promise<HSIncident> {
    const content: IncidentContent = {
      title: input.title.trim(),
      description: input.description ?? '',
      type: input.type,
      severity: input.severity,
      location: input.location ?? '',
      occurredAt: input.occurredAt,
      reportedBy: input.reportedBy ?? '',
      involvedPersons: input.involvedPersons ?? [],
      rootCause: input.rootCause ?? '',
      correctiveActions: input.correctiveActions ?? [],
      status: input.status ?? 'reported',
      resolution: '',
      investigatedBy: '',
      investigatedAt: null,
      closedBy: '',
      closedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'hs_incident',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['hs_incident', content.type, content.severity, content.status]),
        createdBy,
      },
    });

    return toIncident(row as MemoryRow);
  },

  async getIncident(id: string): Promise<HSIncident | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'hs_incident') return null;
    return toIncident(row as MemoryRow);
  },

  async listIncidents(organizationId: string, opts: ListIncidentsOpts = {}): Promise<HSIncident[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'hs_incident', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toIncident(r as MemoryRow));
    if (opts.type) records = records.filter((i) => i.type === opts.type);
    if (opts.severity) records = records.filter((i) => i.severity === opts.severity);
    if (opts.status) records = records.filter((i) => i.status === opts.status);
    if (opts.location) records = records.filter((i) => i.location === opts.location);
    return records;
  },

  async updateIncident(id: string, input: UpdateIncidentInput): Promise<HSIncident | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIncident(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.type !== undefined) content.type = input.type;
    if (input.severity !== undefined) content.severity = input.severity;
    if (input.location !== undefined) content.location = input.location;
    if (input.occurredAt !== undefined) content.occurredAt = input.occurredAt;
    if (input.reportedBy !== undefined) content.reportedBy = input.reportedBy;
    if (input.involvedPersons !== undefined) content.involvedPersons = input.involvedPersons;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['hs_incident', content.type, content.severity, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toIncident(row as MemoryRow);
  },

  async investigateIncident(id: string, rootCause: string, correctiveActions: string[], investigatedBy: string): Promise<HSIncident | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIncident(existing.content);
    content.rootCause = rootCause;
    content.correctiveActions = correctiveActions;
    content.investigatedBy = investigatedBy;
    content.investigatedAt = new Date().toISOString();
    content.status = 'investigating';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['hs_incident', content.type, content.severity, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toIncident(row as MemoryRow);
  },

  async closeIncident(id: string, resolution: string, closedBy: string): Promise<HSIncident | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIncident(existing.content);
    content.resolution = resolution;
    content.closedBy = closedBy;
    content.closedAt = new Date().toISOString();
    content.status = 'closed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['hs_incident', content.type, content.severity, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toIncident(row as MemoryRow);
  },

  // ── Inspections ──

  async createInspection(
    organizationId: string,
    workspaceId: string,
    input: CreateInspectionInput,
    createdBy: string,
  ): Promise<HSInspection> {
    const items: InspectionItem[] = input.items.map((i) => ({
      name: i.name.trim(),
      status: i.status,
      notes: i.notes ?? '',
    }));
    const stats = computeInspectionStats(input.items);

    const content: InspectionContent = {
      title: input.title.trim(),
      area: input.area.trim(),
      inspector: input.inspector.trim(),
      date: input.date,
      items,
      status: input.status ?? 'scheduled',
      passRate: stats.passRate,
      passedCount: stats.passedCount,
      failedCount: stats.failedCount,
      naCount: stats.naCount,
      totalCount: stats.totalCount,
      results: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'hs_inspection',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['hs_inspection', content.status, content.area]),
        createdBy,
      },
    });

    return toInspection(row as MemoryRow);
  },

  async getInspection(id: string): Promise<HSInspection | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'hs_inspection') return null;
    return toInspection(row as MemoryRow);
  },

  async listInspections(organizationId: string, opts: ListInspectionsOpts = {}): Promise<HSInspection[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'hs_inspection', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toInspection(r as MemoryRow));
    if (opts.area) records = records.filter((i) => i.area === opts.area);
    if (opts.status) records = records.filter((i) => i.status === opts.status);
    if (opts.inspector) records = records.filter((i) => i.inspector === opts.inspector);
    return records;
  },

  async updateInspection(id: string, input: UpdateInspectionInput): Promise<HSInspection | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseInspection(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.area !== undefined) content.area = input.area.trim();
    if (input.inspector !== undefined) content.inspector = input.inspector.trim();
    if (input.date !== undefined) content.date = input.date;
    if (input.status !== undefined) content.status = input.status;
    if (input.items !== undefined) {
      content.items = input.items.map((i) => ({ name: i.name.trim(), status: i.status, notes: i.notes ?? '' }));
      const stats = computeInspectionStats(input.items);
      content.passRate = stats.passRate;
      content.passedCount = stats.passedCount;
      content.failedCount = stats.failedCount;
      content.naCount = stats.naCount;
      content.totalCount = stats.totalCount;
    }

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['hs_inspection', content.status, content.area]),
        },
      }), null,
    );
    if (!row) return null;
    return toInspection(row as MemoryRow);
  },

  async completeInspection(id: string, results: string): Promise<HSInspection | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseInspection(existing.content);
    content.results = results;
    content.status = content.failedCount > 0 ? 'failed' : 'completed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['hs_inspection', content.status, content.area]),
        },
      }), null,
    );
    if (!row) return null;
    return toInspection(row as MemoryRow);
  },

  // ── Training ──

  async createTraining(
    organizationId: string,
    workspaceId: string,
    input: CreateTrainingInput,
    createdBy: string,
  ): Promise<HSTraining> {
    const content: TrainingContent = {
      name: input.name.trim(),
      description: input.description ?? '',
      category: input.category ?? '',
      requiredFor: input.requiredFor ?? [],
      durationHours: input.durationHours ?? null,
      frequencyMonths: input.frequencyMonths ?? null,
      provider: input.provider ?? '',
      certification: input.certification ?? '',
      status: input.status ?? 'active',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'hs_training',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['hs_training', content.status, content.category]),
        createdBy,
      },
    });

    return toTraining(row as MemoryRow);
  },

  async getTraining(id: string): Promise<HSTraining | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'hs_training') return null;
    return toTraining(row as MemoryRow);
  },

  async listTrainings(organizationId: string, opts: ListTrainingsOpts = {}): Promise<HSTraining[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'hs_training', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toTraining(r as MemoryRow));
    if (opts.category) records = records.filter((t) => t.category === opts.category);
    if (opts.status) records = records.filter((t) => t.status === opts.status);
    return records;
  },

  async updateTraining(id: string, input: UpdateTrainingInput): Promise<HSTraining | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTraining(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.requiredFor !== undefined) content.requiredFor = input.requiredFor;
    if (input.durationHours !== undefined) content.durationHours = input.durationHours;
    if (input.frequencyMonths !== undefined) content.frequencyMonths = input.frequencyMonths;
    if (input.provider !== undefined) content.provider = input.provider;
    if (input.certification !== undefined) content.certification = input.certification;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['hs_training', content.status, content.category]),
        },
      }), null,
    );
    if (!row) return null;
    return toTraining(row as MemoryRow);
  },

  async deleteTraining(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Hazards ──

  async createHazard(
    organizationId: string,
    workspaceId: string,
    input: CreateHazardInput,
    createdBy: string,
  ): Promise<HSHazard> {
    const content: HazardContent = {
      title: input.title.trim(),
      description: input.description ?? '',
      category: input.category,
      location: input.location ?? '',
      riskLevel: input.riskLevel,
      identifiedBy: input.identifiedBy ?? '',
      identifiedDate: input.identifiedDate ?? new Date().toISOString(),
      mitigation: input.mitigation ?? '',
      status: input.status ?? 'open',
      mitigatedBy: '',
      mitigatedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'hs_hazard',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['hs_hazard', content.category, content.riskLevel, content.status]),
        createdBy,
      },
    });

    return toHazard(row as MemoryRow);
  },

  async getHazard(id: string): Promise<HSHazard | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'hs_hazard') return null;
    return toHazard(row as MemoryRow);
  },

  async listHazards(organizationId: string, opts: ListHazardsOpts = {}): Promise<HSHazard[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'hs_hazard', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toHazard(r as MemoryRow));
    if (opts.category) records = records.filter((h) => h.category === opts.category);
    if (opts.riskLevel) records = records.filter((h) => h.riskLevel === opts.riskLevel);
    if (opts.status) records = records.filter((h) => h.status === opts.status);
    if (opts.location) records = records.filter((h) => h.location === opts.location);
    return records;
  },

  async updateHazard(id: string, input: UpdateHazardInput): Promise<HSHazard | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseHazard(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.location !== undefined) content.location = input.location;
    if (input.riskLevel !== undefined) content.riskLevel = input.riskLevel;
    if (input.identifiedBy !== undefined) content.identifiedBy = input.identifiedBy;
    if (input.identifiedDate !== undefined) content.identifiedDate = input.identifiedDate;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['hs_hazard', content.category, content.riskLevel, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toHazard(row as MemoryRow);
  },

  async mitigateHazard(id: string, mitigation: string, mitigatedBy: string): Promise<HSHazard | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseHazard(existing.content);
    content.mitigation = mitigation;
    content.mitigatedBy = mitigatedBy;
    content.mitigatedAt = new Date().toISOString();
    content.status = 'mitigated';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['hs_hazard', content.category, content.riskLevel, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toHazard(row as MemoryRow);
  },

  // ── Observations ──

  async createObservation(
    organizationId: string,
    workspaceId: string,
    input: CreateObservationInput,
    createdBy: string,
  ): Promise<HSObservation> {
    const content: ObservationContent = {
      observer: input.observer.trim(),
      date: input.date,
      location: input.location.trim(),
      behavior: input.behavior,
      description: input.description ?? '',
      category: input.category ?? '',
      feedback: input.feedback ?? '',
      status: input.status ?? 'open',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'hs_safety_observation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['hs_safety_observation', content.behavior, content.status]),
        createdBy,
      },
    });

    return toObservation(row as MemoryRow);
  },

  async getObservation(id: string): Promise<HSObservation | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'hs_safety_observation') return null;
    return toObservation(row as MemoryRow);
  },

  async listObservations(organizationId: string, opts: ListObservationsOpts = {}): Promise<HSObservation[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'hs_safety_observation', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toObservation(r as MemoryRow));
    if (opts.behavior) records = records.filter((o) => o.behavior === opts.behavior);
    if (opts.location) records = records.filter((o) => o.location === opts.location);
    return records;
  },

  async updateObservation(id: string, input: UpdateObservationInput): Promise<HSObservation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseObservation(existing.content);
    if (input.observer !== undefined) content.observer = input.observer.trim();
    if (input.date !== undefined) content.date = input.date;
    if (input.location !== undefined) content.location = input.location.trim();
    if (input.behavior !== undefined) content.behavior = input.behavior;
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.feedback !== undefined) content.feedback = input.feedback;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['hs_safety_observation', content.behavior, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toObservation(row as MemoryRow);
  },

  // ── Safety Metrics ──

  async getSafetyMetrics(organizationId: string): Promise<SafetyMetrics> {
    const [incidents, inspections, trainings, hazards, observations] = await Promise.all([
      HealthSafetyService.listIncidents(organizationId),
      HealthSafetyService.listInspections(organizationId),
      HealthSafetyService.listTrainings(organizationId),
      HealthSafetyService.listHazards(organizationId),
      HealthSafetyService.listObservations(organizationId),
    ]);

    const recordableIncidents = incidents.filter(
      (i) => i.type === 'injury' && (i.severity === 'moderate' || i.severity === 'serious' || i.severity === 'fatal'),
    ).length;

    // TRIR = (recordable incidents × 200,000) / total hours worked. We use a simplified proxy.
    const trir = incidents.length > 0 ? Math.round((recordableIncidents / incidents.length) * 100) : 0;

    const openHazardsByRiskLevel: Record<string, number> = {};
    for (const h of hazards) {
      if (h.status === 'open' || h.status === 'mitigating') {
        openHazardsByRiskLevel[h.riskLevel] = (openHazardsByRiskLevel[h.riskLevel] || 0) + 1;
      }
    }

    const completedInspections = inspections.filter((i) => i.status === 'completed' || i.status === 'failed');
    const avgPassRate = completedInspections.length > 0
      ? Math.round(completedInspections.reduce((sum, i) => sum + i.passRate, 0) / completedInspections.length)
      : 0;

    const activeTrainings = trainings.filter((t) => t.status === 'active').length;
    const trainingCompliance = trainings.length > 0 ? Math.round((activeTrainings / trainings.length) * 100) : 0;

    const observationsSafe = observations.filter((o) => o.behavior === 'safe').length;
    const observationsUnsafe = observations.filter((o) => o.behavior === 'unsafe').length;

    return {
      trir,
      totalIncidents: incidents.length,
      recordableIncidents,
      openHazardsByRiskLevel,
      inspectionPassRate: avgPassRate,
      totalInspections: inspections.length,
      trainingCompliance,
      totalTrainings: trainings.length,
      activeTrainings,
      observationsSafe,
      observationsUnsafe,
      totalObservations: observations.length,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<SafetyStats> {
    const [incidents, inspections, trainings, hazards, observations, metrics] = await Promise.all([
      HealthSafetyService.listIncidents(organizationId),
      HealthSafetyService.listInspections(organizationId),
      HealthSafetyService.listTrainings(organizationId),
      HealthSafetyService.listHazards(organizationId),
      HealthSafetyService.listObservations(organizationId),
      HealthSafetyService.getSafetyMetrics(organizationId),
    ]);

    const byIncidentType: Record<string, number> = {};
    const byIncidentSeverity: Record<string, number> = {};
    const byIncidentStatus: Record<string, number> = {};
    let openIncidentCount = 0;
    for (const i of incidents) {
      byIncidentType[i.type] = (byIncidentType[i.type] || 0) + 1;
      byIncidentSeverity[i.severity] = (byIncidentSeverity[i.severity] || 0) + 1;
      byIncidentStatus[i.status] = (byIncidentStatus[i.status] || 0) + 1;
      if (i.status !== 'closed') openIncidentCount++;
    }

    const byHazardRiskLevel: Record<string, number> = {};
    const byHazardStatus: Record<string, number> = {};
    let openHazardCount = 0;
    for (const h of hazards) {
      byHazardRiskLevel[h.riskLevel] = (byHazardRiskLevel[h.riskLevel] || 0) + 1;
      byHazardStatus[h.status] = (byHazardStatus[h.status] || 0) + 1;
      if (h.status === 'open' || h.status === 'mitigating') openHazardCount++;
    }

    const completedInspectionCount = inspections.filter((i) => i.status === 'completed' || i.status === 'failed').length;
    const activeTrainingCount = trainings.filter((t) => t.status === 'active').length;

    return {
      incidentCount: incidents.length,
      openIncidentCount,
      inspectionCount: inspections.length,
      completedInspectionCount,
      trainingCount: trainings.length,
      activeTrainingCount,
      hazardCount: hazards.length,
      openHazardCount,
      observationCount: observations.length,
      trir: metrics.trir,
      inspectionPassRate: metrics.inspectionPassRate,
      byIncidentType,
      byIncidentSeverity,
      byIncidentStatus,
      byHazardRiskLevel,
      byHazardStatus,
    };
  },
};
