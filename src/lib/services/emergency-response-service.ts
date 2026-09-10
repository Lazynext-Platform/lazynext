import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type EmergencyPlanType = 'fire' | 'earthquake' | 'flood' | 'chemical_spill' | 'active_shooter' | 'bomb_threat' | 'power_outage' | 'medical_emergency' | 'natural_disaster' | 'pandemic' | 'general';
export type EmergencyPlanStatus = 'draft' | 'active' | 'tested' | 'deprecated' | 'archived';
export type EmergencyDrillType = 'fire_evacuation' | 'earthquake' | 'lockdown' | 'shelter_in_place' | 'chemical_spill' | 'medical' | 'multi_scenario';
export type EmergencyDrillStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
export type EvacuationRouteType = 'primary' | 'secondary' | 'emergency_exit' | 'accessible' | 'assembly_point' | 'stairwell' | 'elevator';
export type EvacuationRouteStatus = 'active' | 'blocked' | 'under_maintenance' | 'deprecated';
export type EmergencyContactType = 'internal' | 'external' | 'first_responder' | 'medical' | 'fire' | 'police' | 'utility' | 'contractor' | 'government';
export type EmergencyContactStatus = 'active' | 'inactive' | 'backup' | 'unreachable';

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

export interface EmergencyPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: EmergencyPlanType;
  description: string;
  status: EmergencyPlanStatus;
  scenario: string;
  severity: string;
  responseTime: string;
  responsiblePerson: string;
  location: string;
  lastReviewed: Date | null;
  nextReview: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyDrill {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: EmergencyDrillType;
  description: string;
  status: EmergencyDrillStatus;
  planId: string | null;
  drillDate: Date | null;
  duration: number;
  participants: number;
  observer: string;
  results: string;
  improvements: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvacuationRoute {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: EvacuationRouteType;
  description: string;
  status: EvacuationRouteStatus;
  location: string;
  capacity: number;
  distance: number;
  assemblyPoint: string;
  routeMap: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyContact {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: EmergencyContactType;
  description: string;
  status: EmergencyContactStatus;
  contactName: string;
  role: string;
  phone: string;
  email: string;
  address: string;
  availability: string;
  priority: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyResponseMetrics {
  activePlans: number;
  scheduledDrills: number;
  activeRoutes: number;
  activeContacts: number;
  completedDrills: number;
}

export interface EmergencyResponseStats {
  planCount: number;
  drillCount: number;
  routeCount: number;
  contactCount: number;
  byPlanType: Record<string, number>;
  byPlanStatus: Record<string, number>;
  byDrillType: Record<string, number>;
  byDrillStatus: Record<string, number>;
  byRouteType: Record<string, number>;
  byRouteStatus: Record<string, number>;
  byContactType: Record<string, number>;
  byContactStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateEmergencyPlanInput {
  name: string;
  type: EmergencyPlanType;
  description?: string;
  status?: EmergencyPlanStatus;
  scenario?: string;
  severity?: string;
  responseTime?: string;
  responsiblePerson?: string;
  location?: string;
  lastReviewed?: string;
  nextReview?: string;
  notes?: string;
}

export interface UpdateEmergencyPlanInput {
  name?: string;
  type?: EmergencyPlanType;
  description?: string;
  status?: EmergencyPlanStatus;
  scenario?: string;
  severity?: string;
  responseTime?: string;
  responsiblePerson?: string;
  location?: string;
  lastReviewed?: string;
  nextReview?: string;
  notes?: string;
}

export interface ListEmergencyPlansOpts {
  type?: EmergencyPlanType;
  status?: EmergencyPlanStatus;
}

export interface CreateEmergencyDrillInput {
  name: string;
  type: EmergencyDrillType;
  description?: string;
  status?: EmergencyDrillStatus;
  planId?: string;
  drillDate?: string;
  duration?: number;
  participants?: number;
  observer?: string;
  results?: string;
  improvements?: string;
  notes?: string;
}

export interface UpdateEmergencyDrillInput {
  name?: string;
  type?: EmergencyDrillType;
  description?: string;
  status?: EmergencyDrillStatus;
  planId?: string;
  drillDate?: string;
  duration?: number;
  participants?: number;
  observer?: string;
  results?: string;
  improvements?: string;
  notes?: string;
}

export interface ListEmergencyDrillsOpts {
  type?: EmergencyDrillType;
  status?: EmergencyDrillStatus;
  planId?: string;
}

export interface CreateEvacuationRouteInput {
  name: string;
  type: EvacuationRouteType;
  description?: string;
  status?: EvacuationRouteStatus;
  location?: string;
  capacity?: number;
  distance?: number;
  assemblyPoint?: string;
  routeMap?: string;
  notes?: string;
}

export interface UpdateEvacuationRouteInput {
  name?: string;
  type?: EvacuationRouteType;
  description?: string;
  status?: EvacuationRouteStatus;
  location?: string;
  capacity?: number;
  distance?: number;
  assemblyPoint?: string;
  routeMap?: string;
  notes?: string;
}

export interface ListEvacuationRoutesOpts {
  type?: EvacuationRouteType;
  status?: EvacuationRouteStatus;
}

export interface CreateEmergencyContactInput {
  name: string;
  type: EmergencyContactType;
  description?: string;
  status?: EmergencyContactStatus;
  contactName?: string;
  role?: string;
  phone?: string;
  email?: string;
  address?: string;
  availability?: string;
  priority?: number;
  notes?: string;
}

export interface UpdateEmergencyContactInput {
  name?: string;
  type?: EmergencyContactType;
  description?: string;
  status?: EmergencyContactStatus;
  contactName?: string;
  role?: string;
  phone?: string;
  email?: string;
  address?: string;
  availability?: string;
  priority?: number;
  notes?: string;
}

export interface ListEmergencyContactsOpts {
  type?: EmergencyContactType;
  status?: EmergencyContactStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toEmergencyPlan(row: MemoryRow): EmergencyPlan {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as EmergencyPlanType) ?? 'general',
    description: (c.description as string) ?? '',
    status: (c.status as EmergencyPlanStatus) ?? 'draft',
    scenario: (c.scenario as string) ?? '',
    severity: (c.severity as string) ?? '',
    responseTime: (c.responseTime as string) ?? '',
    responsiblePerson: (c.responsiblePerson as string) ?? '',
    location: (c.location as string) ?? '',
    lastReviewed: c.lastReviewed ? new Date(c.lastReviewed as string) : null,
    nextReview: c.nextReview ? new Date(c.nextReview as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEmergencyDrill(row: MemoryRow): EmergencyDrill {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as EmergencyDrillType) ?? 'fire_evacuation',
    description: (c.description as string) ?? '',
    status: (c.status as EmergencyDrillStatus) ?? 'scheduled',
    planId: (c.planId as string) ?? null,
    drillDate: c.drillDate ? new Date(c.drillDate as string) : null,
    duration: (c.duration as number) ?? 0,
    participants: (c.participants as number) ?? 0,
    observer: (c.observer as string) ?? '',
    results: (c.results as string) ?? '',
    improvements: (c.improvements as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEvacuationRoute(row: MemoryRow): EvacuationRoute {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as EvacuationRouteType) ?? 'primary',
    description: (c.description as string) ?? '',
    status: (c.status as EvacuationRouteStatus) ?? 'active',
    location: (c.location as string) ?? '',
    capacity: (c.capacity as number) ?? 0,
    distance: (c.distance as number) ?? 0,
    assemblyPoint: (c.assemblyPoint as string) ?? '',
    routeMap: (c.routeMap as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEmergencyContact(row: MemoryRow): EmergencyContact {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as EmergencyContactType) ?? 'internal',
    description: (c.description as string) ?? '',
    status: (c.status as EmergencyContactStatus) ?? 'active',
    contactName: (c.contactName as string) ?? '',
    role: (c.role as string) ?? '',
    phone: (c.phone as string) ?? '',
    email: (c.email as string) ?? '',
    address: (c.address as string) ?? '',
    availability: (c.availability as string) ?? '',
    priority: (c.priority as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const EmergencyResponseService = {
  // ── Emergency Plans ──

  async createEmergencyPlan(organizationId: string, workspaceId: string, input: CreateEmergencyPlanInput, createdBy: string): Promise<EmergencyPlan> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      scenario: input.scenario ?? '',
      severity: input.severity ?? '',
      responseTime: input.responseTime ?? '',
      responsiblePerson: input.responsiblePerson ?? '',
      location: input.location ?? '',
      lastReviewed: input.lastReviewed ?? null,
      nextReview: input.nextReview ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'emergency_plan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['emergency_plan', content.type, content.status]),
        createdBy,
      },
    });
    return toEmergencyPlan(row as MemoryRow);
  },

  async getEmergencyPlan(id: string): Promise<EmergencyPlan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'emergency_plan') return null;
    return toEmergencyPlan(row as MemoryRow);
  },

  async listEmergencyPlans(organizationId: string, opts: ListEmergencyPlansOpts = {}): Promise<EmergencyPlan[]> {
    const where: Record<string, unknown> = { organizationId, type: 'emergency_plan' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEmergencyPlan);
  },

  async updateEmergencyPlan(id: string, input: UpdateEmergencyPlanInput): Promise<EmergencyPlan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scenario !== undefined && { scenario: input.scenario }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.responseTime !== undefined && { responseTime: input.responseTime }),
      ...(input.responsiblePerson !== undefined && { responsiblePerson: input.responsiblePerson }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.lastReviewed !== undefined && { lastReviewed: input.lastReviewed }),
      ...(input.nextReview !== undefined && { nextReview: input.nextReview }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['emergency_plan', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toEmergencyPlan(row as MemoryRow);
  },

  async deleteEmergencyPlan(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateEmergencyPlan(id: string, _activatedBy: string): Promise<EmergencyPlan | null> {
    return EmergencyResponseService.updateEmergencyPlan(id, { status: 'active' });
  },

  async testEmergencyPlan(id: string, _testedBy: string): Promise<EmergencyPlan | null> {
    return EmergencyResponseService.updateEmergencyPlan(id, { status: 'tested', lastReviewed: new Date().toISOString() });
  },

  async deprecateEmergencyPlan(id: string, _deprecatedBy: string): Promise<EmergencyPlan | null> {
    return EmergencyResponseService.updateEmergencyPlan(id, { status: 'deprecated' });
  },

  async archiveEmergencyPlan(id: string, _archivedBy: string): Promise<EmergencyPlan | null> {
    return EmergencyResponseService.updateEmergencyPlan(id, { status: 'archived' });
  },

  // ── Emergency Drills ──

  async createEmergencyDrill(organizationId: string, workspaceId: string, input: CreateEmergencyDrillInput, createdBy: string): Promise<EmergencyDrill> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      planId: input.planId ?? null,
      drillDate: input.drillDate ?? null,
      duration: input.duration ?? 0,
      participants: input.participants ?? 0,
      observer: input.observer ?? '',
      results: input.results ?? '',
      improvements: input.improvements ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'emergency_drill',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['emergency_drill', content.type, content.status]),
        createdBy,
      },
    });
    return toEmergencyDrill(row as MemoryRow);
  },

  async getEmergencyDrill(id: string): Promise<EmergencyDrill | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'emergency_drill') return null;
    return toEmergencyDrill(row as MemoryRow);
  },

  async listEmergencyDrills(organizationId: string, opts: ListEmergencyDrillsOpts = {}): Promise<EmergencyDrill[]> {
    const where: Record<string, unknown> = { organizationId, type: 'emergency_drill' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.planId) conditions.push({ content: { contains: `"planId":"${opts.planId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEmergencyDrill);
  },

  async updateEmergencyDrill(id: string, input: UpdateEmergencyDrillInput): Promise<EmergencyDrill | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.planId !== undefined && { planId: input.planId }),
      ...(input.drillDate !== undefined && { drillDate: input.drillDate }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.participants !== undefined && { participants: input.participants }),
      ...(input.observer !== undefined && { observer: input.observer }),
      ...(input.results !== undefined && { results: input.results }),
      ...(input.improvements !== undefined && { improvements: input.improvements }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['emergency_drill', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toEmergencyDrill(row as MemoryRow);
  },

  async deleteEmergencyDrill(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async scheduleEmergencyDrill(id: string, _scheduledBy: string): Promise<EmergencyDrill | null> {
    return EmergencyResponseService.updateEmergencyDrill(id, { status: 'scheduled' });
  },

  async startEmergencyDrill(id: string, _startedBy: string): Promise<EmergencyDrill | null> {
    return EmergencyResponseService.updateEmergencyDrill(id, { status: 'in_progress' });
  },

  async completeEmergencyDrill(id: string, _completedBy: string): Promise<EmergencyDrill | null> {
    return EmergencyResponseService.updateEmergencyDrill(id, { status: 'completed', drillDate: new Date().toISOString() });
  },

  async cancelEmergencyDrill(id: string, _cancelledBy: string): Promise<EmergencyDrill | null> {
    return EmergencyResponseService.updateEmergencyDrill(id, { status: 'cancelled' });
  },

  async failEmergencyDrill(id: string, _failedBy: string): Promise<EmergencyDrill | null> {
    return EmergencyResponseService.updateEmergencyDrill(id, { status: 'failed' });
  },

  // ── Evacuation Routes ──

  async createEvacuationRoute(organizationId: string, workspaceId: string, input: CreateEvacuationRouteInput, createdBy: string): Promise<EvacuationRoute> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      location: input.location ?? '',
      capacity: input.capacity ?? 0,
      distance: input.distance ?? 0,
      assemblyPoint: input.assemblyPoint ?? '',
      routeMap: input.routeMap ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'evacuation_route',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['evacuation_route', content.type, content.status]),
        createdBy,
      },
    });
    return toEvacuationRoute(row as MemoryRow);
  },

  async getEvacuationRoute(id: string): Promise<EvacuationRoute | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'evacuation_route') return null;
    return toEvacuationRoute(row as MemoryRow);
  },

  async listEvacuationRoutes(organizationId: string, opts: ListEvacuationRoutesOpts = {}): Promise<EvacuationRoute[]> {
    const where: Record<string, unknown> = { organizationId, type: 'evacuation_route' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEvacuationRoute);
  },

  async updateEvacuationRoute(id: string, input: UpdateEvacuationRouteInput): Promise<EvacuationRoute | null> {
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
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.distance !== undefined && { distance: input.distance }),
      ...(input.assemblyPoint !== undefined && { assemblyPoint: input.assemblyPoint }),
      ...(input.routeMap !== undefined && { routeMap: input.routeMap }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['evacuation_route', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toEvacuationRoute(row as MemoryRow);
  },

  async deleteEvacuationRoute(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateEvacuationRoute(id: string, _activatedBy: string): Promise<EvacuationRoute | null> {
    return EmergencyResponseService.updateEvacuationRoute(id, { status: 'active' });
  },

  async blockEvacuationRoute(id: string, _blockedBy: string): Promise<EvacuationRoute | null> {
    return EmergencyResponseService.updateEvacuationRoute(id, { status: 'blocked' });
  },

  async maintainEvacuationRoute(id: string, _maintainedBy: string): Promise<EvacuationRoute | null> {
    return EmergencyResponseService.updateEvacuationRoute(id, { status: 'under_maintenance' });
  },

  async deprecateEvacuationRoute(id: string, _deprecatedBy: string): Promise<EvacuationRoute | null> {
    return EmergencyResponseService.updateEvacuationRoute(id, { status: 'deprecated' });
  },

  // ── Emergency Contacts ──

  async createEmergencyContact(organizationId: string, workspaceId: string, input: CreateEmergencyContactInput, createdBy: string): Promise<EmergencyContact> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      contactName: input.contactName ?? '',
      role: input.role ?? '',
      phone: input.phone ?? '',
      email: input.email ?? '',
      address: input.address ?? '',
      availability: input.availability ?? '',
      priority: input.priority ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'emergency_contact',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['emergency_contact', content.type, content.status]),
        createdBy,
      },
    });
    return toEmergencyContact(row as MemoryRow);
  },

  async getEmergencyContact(id: string): Promise<EmergencyContact | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'emergency_contact') return null;
    return toEmergencyContact(row as MemoryRow);
  },

  async listEmergencyContacts(organizationId: string, opts: ListEmergencyContactsOpts = {}): Promise<EmergencyContact[]> {
    const where: Record<string, unknown> = { organizationId, type: 'emergency_contact' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEmergencyContact);
  },

  async updateEmergencyContact(id: string, input: UpdateEmergencyContactInput): Promise<EmergencyContact | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.contactName !== undefined && { contactName: input.contactName }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.availability !== undefined && { availability: input.availability }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['emergency_contact', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toEmergencyContact(row as MemoryRow);
  },

  async deleteEmergencyContact(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateEmergencyContact(id: string, _activatedBy: string): Promise<EmergencyContact | null> {
    return EmergencyResponseService.updateEmergencyContact(id, { status: 'active' });
  },

  async deactivateEmergencyContact(id: string, _deactivatedBy: string): Promise<EmergencyContact | null> {
    return EmergencyResponseService.updateEmergencyContact(id, { status: 'inactive' });
  },

  async markBackupEmergencyContact(id: string, _markedBy: string): Promise<EmergencyContact | null> {
    return EmergencyResponseService.updateEmergencyContact(id, { status: 'backup' });
  },

  async markUnreachableEmergencyContact(id: string, _markedBy: string): Promise<EmergencyContact | null> {
    return EmergencyResponseService.updateEmergencyContact(id, { status: 'unreachable' });
  },

  // ── Metrics & Stats ──

  async getEmergencyResponseMetrics(organizationId: string): Promise<EmergencyResponseMetrics> {
    const [plans, drills, routes, contacts] = await Promise.all([
      EmergencyResponseService.listEmergencyPlans(organizationId),
      EmergencyResponseService.listEmergencyDrills(organizationId),
      EmergencyResponseService.listEvacuationRoutes(organizationId),
      EmergencyResponseService.listEmergencyContacts(organizationId),
    ]);
    return {
      activePlans: plans.filter((p) => p.status === 'active').length,
      scheduledDrills: drills.filter((d) => d.status === 'scheduled').length,
      activeRoutes: routes.filter((r) => r.status === 'active').length,
      activeContacts: contacts.filter((c) => c.status === 'active').length,
      completedDrills: drills.filter((d) => d.status === 'completed').length,
    };
  },

  async getEmergencyResponseStats(organizationId: string): Promise<EmergencyResponseStats> {
    const [plans, drills, routes, contacts] = await Promise.all([
      EmergencyResponseService.listEmergencyPlans(organizationId),
      EmergencyResponseService.listEmergencyDrills(organizationId),
      EmergencyResponseService.listEvacuationRoutes(organizationId),
      EmergencyResponseService.listEmergencyContacts(organizationId),
    ]);
    const byPlanType: Record<string, number> = {};
    const byPlanStatus: Record<string, number> = {};
    const byDrillType: Record<string, number> = {};
    const byDrillStatus: Record<string, number> = {};
    const byRouteType: Record<string, number> = {};
    const byRouteStatus: Record<string, number> = {};
    const byContactType: Record<string, number> = {};
    const byContactStatus: Record<string, number> = {};
    for (const p of plans) { byPlanType[p.type] = (byPlanType[p.type] ?? 0) + 1; byPlanStatus[p.status] = (byPlanStatus[p.status] ?? 0) + 1; }
    for (const d of drills) { byDrillType[d.type] = (byDrillType[d.type] ?? 0) + 1; byDrillStatus[d.status] = (byDrillStatus[d.status] ?? 0) + 1; }
    for (const r of routes) { byRouteType[r.type] = (byRouteType[r.type] ?? 0) + 1; byRouteStatus[r.status] = (byRouteStatus[r.status] ?? 0) + 1; }
    for (const c of contacts) { byContactType[c.type] = (byContactType[c.type] ?? 0) + 1; byContactStatus[c.status] = (byContactStatus[c.status] ?? 0) + 1; }
    return {
      planCount: plans.length,
      drillCount: drills.length,
      routeCount: routes.length,
      contactCount: contacts.length,
      byPlanType, byPlanStatus, byDrillType, byDrillStatus, byRouteType, byRouteStatus, byContactType, byContactStatus,
    };
  },
};
