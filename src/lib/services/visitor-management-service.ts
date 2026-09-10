import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type VisitType = 'business' | 'interview' | 'vendor' | 'contractor' | 'client' | 'delivery' | 'maintenance' | 'tour' | 'training' | 'conference' | 'personal';
export type VisitStatus = 'pre_registered' | 'checked_in' | 'checked_out' | 'denied' | 'cancelled' | 'expired' | 'no_show';
export type BadgeType = 'visitor' | 'contractor' | 'vendor' | 'temporary' | 'vip' | 'day_pass' | 'escorted';
export type BadgeStatus = 'issued' | 'active' | 'returned' | 'lost' | 'expired' | 'revoked';
export type HostType = 'employee' | 'department' | 'external' | 'security' | 'reception';
export type HostStatus = 'active' | 'inactive' | 'unavailable';
export type LogType = 'check_in' | 'check_out' | 'badge_issued' | 'badge_returned' | 'access_granted' | 'access_denied' | 'escort_required' | 'escalation' | 'incident';
export type LogStatus = 'recorded' | 'reviewed' | 'flagged' | 'archived';

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

export interface VisitorVisit {
  id: string;
  organizationId: string;
  workspaceId: string;
  visitorName: string;
  type: VisitType;
  description: string;
  status: VisitStatus;
  hostId: string | null;
  hostName: string;
  company: string;
  email: string;
  phone: string;
  purpose: string;
  expectedArrival: Date | null;
  expectedDeparture: Date | null;
  actualArrival: Date | null;
  actualDeparture: Date | null;
  escortRequired: boolean;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VisitorBadge {
  id: string;
  organizationId: string;
  workspaceId: string;
  visitId: string;
  type: BadgeType;
  description: string;
  status: BadgeStatus;
  badgeNumber: string;
  issuedAt: Date | null;
  returnedAt: Date | null;
  printedBy: string;
  accessLevel: string;
  validAreas: string[];
  expiresAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VisitorHost {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: HostType;
  description: string;
  status: HostStatus;
  department: string;
  email: string;
  phone: string;
  location: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VisitorAccessLog {
  id: string;
  organizationId: string;
  workspaceId: string;
  visitId: string | null;
  badgeId: string | null;
  type: LogType;
  description: string;
  status: LogStatus;
  timestamp: Date | null;
  location: string;
  officer: string;
  outcome: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VisitorManagementMetrics {
  preRegisteredVisits: number;
  checkedInVisitors: number;
  activeBadges: number;
  activeHosts: number;
  flaggedLogs: number;
}

export interface VisitorManagementStats {
  visitCount: number;
  badgeCount: number;
  hostCount: number;
  logCount: number;
  byVisitType: Record<string, number>;
  byVisitStatus: Record<string, number>;
  byBadgeType: Record<string, number>;
  byBadgeStatus: Record<string, number>;
  byHostType: Record<string, number>;
  byHostStatus: Record<string, number>;
  byLogType: Record<string, number>;
  byLogStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateVisitInput {
  visitorName: string;
  type: VisitType;
  description?: string;
  status?: VisitStatus;
  hostId?: string;
  hostName?: string;
  company?: string;
  email?: string;
  phone?: string;
  purpose?: string;
  expectedArrival?: string;
  expectedDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  escortRequired?: boolean;
  notes?: string;
}

export interface UpdateVisitInput {
  visitorName?: string;
  type?: VisitType;
  description?: string;
  status?: VisitStatus;
  hostId?: string;
  hostName?: string;
  company?: string;
  email?: string;
  phone?: string;
  purpose?: string;
  expectedArrival?: string;
  expectedDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  escortRequired?: boolean;
  notes?: string;
}

export interface ListVisitsOpts {
  type?: VisitType;
  status?: VisitStatus;
  hostId?: string;
}

export interface CreateBadgeInput {
  visitId: string;
  type: BadgeType;
  description?: string;
  status?: BadgeStatus;
  badgeNumber?: string;
  issuedAt?: string;
  returnedAt?: string;
  printedBy?: string;
  accessLevel?: string;
  validAreas?: string[];
  expiresAt?: string;
  notes?: string;
}

export interface UpdateBadgeInput {
  visitId?: string;
  type?: BadgeType;
  description?: string;
  status?: BadgeStatus;
  badgeNumber?: string;
  issuedAt?: string;
  returnedAt?: string;
  printedBy?: string;
  accessLevel?: string;
  validAreas?: string[];
  expiresAt?: string;
  notes?: string;
}

export interface ListBadgesOpts {
  visitId?: string;
  type?: BadgeType;
  status?: BadgeStatus;
}

export interface CreateHostInput {
  name: string;
  type: HostType;
  description?: string;
  status?: HostStatus;
  department?: string;
  email?: string;
  phone?: string;
  location?: string;
  notes?: string;
}

export interface UpdateHostInput {
  name?: string;
  type?: HostType;
  description?: string;
  status?: HostStatus;
  department?: string;
  email?: string;
  phone?: string;
  location?: string;
  notes?: string;
}

export interface ListHostsOpts {
  type?: HostType;
  status?: HostStatus;
}

export interface CreateAccessLogInput {
  visitId?: string;
  badgeId?: string;
  type: LogType;
  description?: string;
  status?: LogStatus;
  timestamp?: string;
  location?: string;
  officer?: string;
  outcome?: string;
  notes?: string;
}

export interface UpdateAccessLogInput {
  visitId?: string;
  badgeId?: string;
  type?: LogType;
  description?: string;
  status?: LogStatus;
  timestamp?: string;
  location?: string;
  officer?: string;
  outcome?: string;
  notes?: string;
}

export interface ListAccessLogsOpts {
  visitId?: string;
  badgeId?: string;
  type?: LogType;
  status?: LogStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toVisit(row: MemoryRow): VisitorVisit {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    visitorName: (c.visitorName as string) ?? '',
    type: (c.type as VisitType) ?? 'business',
    description: (c.description as string) ?? '',
    status: (c.status as VisitStatus) ?? 'pre_registered',
    hostId: (c.hostId as string) ?? null,
    hostName: (c.hostName as string) ?? '',
    company: (c.company as string) ?? '',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    purpose: (c.purpose as string) ?? '',
    expectedArrival: c.expectedArrival ? new Date(c.expectedArrival as string) : null,
    expectedDeparture: c.expectedDeparture ? new Date(c.expectedDeparture as string) : null,
    actualArrival: c.actualArrival ? new Date(c.actualArrival as string) : null,
    actualDeparture: c.actualDeparture ? new Date(c.actualDeparture as string) : null,
    escortRequired: (c.escortRequired as boolean) ?? false,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toBadge(row: MemoryRow): VisitorBadge {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    visitId: (c.visitId as string) ?? '',
    type: (c.type as BadgeType) ?? 'visitor',
    description: (c.description as string) ?? '',
    status: (c.status as BadgeStatus) ?? 'issued',
    badgeNumber: (c.badgeNumber as string) ?? '',
    issuedAt: c.issuedAt ? new Date(c.issuedAt as string) : null,
    returnedAt: c.returnedAt ? new Date(c.returnedAt as string) : null,
    printedBy: (c.printedBy as string) ?? '',
    accessLevel: (c.accessLevel as string) ?? '',
    validAreas: (c.validAreas as string[]) ?? [],
    expiresAt: c.expiresAt ? new Date(c.expiresAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toHost(row: MemoryRow): VisitorHost {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as HostType) ?? 'employee',
    description: (c.description as string) ?? '',
    status: (c.status as HostStatus) ?? 'active',
    department: (c.department as string) ?? '',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    location: (c.location as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAccessLog(row: MemoryRow): VisitorAccessLog {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    visitId: (c.visitId as string) ?? null,
    badgeId: (c.badgeId as string) ?? null,
    type: (c.type as LogType) ?? 'check_in',
    description: (c.description as string) ?? '',
    status: (c.status as LogStatus) ?? 'recorded',
    timestamp: c.timestamp ? new Date(c.timestamp as string) : null,
    location: (c.location as string) ?? '',
    officer: (c.officer as string) ?? '',
    outcome: (c.outcome as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const VisitorManagementService = {
  // ── Visits ──

  async createVisit(organizationId: string, workspaceId: string, input: CreateVisitInput, createdBy: string): Promise<VisitorVisit> {
    const content = {
      visitorName: input.visitorName.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pre_registered',
      hostId: input.hostId ?? null,
      hostName: input.hostName ?? '',
      company: input.company ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      purpose: input.purpose ?? '',
      expectedArrival: input.expectedArrival ?? null,
      expectedDeparture: input.expectedDeparture ?? null,
      actualArrival: input.actualArrival ?? null,
      actualDeparture: input.actualDeparture ?? null,
      escortRequired: input.escortRequired ?? false,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'visitor_visit',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.hostId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['visitor_visit', content.type, content.status]),
        createdBy,
      },
    });
    return toVisit(row as MemoryRow);
  },

  async getVisit(id: string): Promise<VisitorVisit | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'visitor_visit') return null;
    return toVisit(row as MemoryRow);
  },

  async listVisits(organizationId: string, opts: ListVisitsOpts = {}): Promise<VisitorVisit[]> {
    const where: Record<string, unknown> = { organizationId, type: 'visitor_visit' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.hostId) conditions.push({ content: { contains: `"hostId":"${opts.hostId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toVisit);
  },

  async updateVisit(id: string, input: UpdateVisitInput): Promise<VisitorVisit | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.visitorName !== undefined && { visitorName: input.visitorName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.hostId !== undefined && { hostId: input.hostId }),
      ...(input.hostName !== undefined && { hostName: input.hostName }),
      ...(input.company !== undefined && { company: input.company }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.expectedArrival !== undefined && { expectedArrival: input.expectedArrival }),
      ...(input.expectedDeparture !== undefined && { expectedDeparture: input.expectedDeparture }),
      ...(input.actualArrival !== undefined && { actualArrival: input.actualArrival }),
      ...(input.actualDeparture !== undefined && { actualDeparture: input.actualDeparture }),
      ...(input.escortRequired !== undefined && { escortRequired: input.escortRequired }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['visitor_visit', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toVisit(row as MemoryRow);
  },

  async deleteVisit(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async checkIn(id: string, _checkedInBy: string): Promise<VisitorVisit | null> {
    return VisitorManagementService.updateVisit(id, { status: 'checked_in', actualArrival: new Date().toISOString() });
  },

  async checkOut(id: string, _checkedOutBy: string): Promise<VisitorVisit | null> {
    return VisitorManagementService.updateVisit(id, { status: 'checked_out', actualDeparture: new Date().toISOString() });
  },

  async denyVisit(id: string, _deniedBy: string): Promise<VisitorVisit | null> {
    return VisitorManagementService.updateVisit(id, { status: 'denied' });
  },

  async cancelVisit(id: string, _cancelledBy: string): Promise<VisitorVisit | null> {
    return VisitorManagementService.updateVisit(id, { status: 'cancelled' });
  },

  async expireVisit(id: string, _expiredBy: string): Promise<VisitorVisit | null> {
    return VisitorManagementService.updateVisit(id, { status: 'expired' });
  },

  // ── Badges ──

  async createBadge(organizationId: string, workspaceId: string, input: CreateBadgeInput, createdBy: string): Promise<VisitorBadge> {
    const content = {
      visitId: input.visitId,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'issued',
      badgeNumber: input.badgeNumber ?? '',
      issuedAt: input.issuedAt ?? null,
      returnedAt: input.returnedAt ?? null,
      printedBy: input.printedBy ?? '',
      accessLevel: input.accessLevel ?? '',
      validAreas: input.validAreas ?? [],
      expiresAt: input.expiresAt ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'visitor_badge',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.visitId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['visitor_badge', content.type, content.status]),
        createdBy,
      },
    });
    return toBadge(row as MemoryRow);
  },

  async getBadge(id: string): Promise<VisitorBadge | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'visitor_badge') return null;
    return toBadge(row as MemoryRow);
  },

  async listBadges(organizationId: string, opts: ListBadgesOpts = {}): Promise<VisitorBadge[]> {
    const where: Record<string, unknown> = { organizationId, type: 'visitor_badge' };
    const conditions: unknown[] = [];
    if (opts.visitId) conditions.push({ content: { contains: `"visitId":"${opts.visitId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toBadge);
  },

  async updateBadge(id: string, input: UpdateBadgeInput): Promise<VisitorBadge | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.visitId !== undefined && { visitId: input.visitId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.badgeNumber !== undefined && { badgeNumber: input.badgeNumber }),
      ...(input.issuedAt !== undefined && { issuedAt: input.issuedAt }),
      ...(input.returnedAt !== undefined && { returnedAt: input.returnedAt }),
      ...(input.printedBy !== undefined && { printedBy: input.printedBy }),
      ...(input.accessLevel !== undefined && { accessLevel: input.accessLevel }),
      ...(input.validAreas !== undefined && { validAreas: input.validAreas }),
      ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['visitor_badge', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toBadge(row as MemoryRow);
  },

  async deleteBadge(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateBadge(id: string, _activatedBy: string): Promise<VisitorBadge | null> {
    return VisitorManagementService.updateBadge(id, { status: 'active' });
  },

  async returnBadge(id: string, _returnedBy: string): Promise<VisitorBadge | null> {
    return VisitorManagementService.updateBadge(id, { status: 'returned', returnedAt: new Date().toISOString() });
  },

  async loseBadge(id: string, _lostBy: string): Promise<VisitorBadge | null> {
    return VisitorManagementService.updateBadge(id, { status: 'lost' });
  },

  async expireBadge(id: string, _expiredBy: string): Promise<VisitorBadge | null> {
    return VisitorManagementService.updateBadge(id, { status: 'expired' });
  },

  async revokeBadge(id: string, _revokedBy: string): Promise<VisitorBadge | null> {
    return VisitorManagementService.updateBadge(id, { status: 'revoked' });
  },

  // ── Hosts ──

  async createHost(organizationId: string, workspaceId: string, input: CreateHostInput, createdBy: string): Promise<VisitorHost> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      department: input.department ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      location: input.location ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'visitor_host',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['visitor_host', content.type, content.status]),
        createdBy,
      },
    });
    return toHost(row as MemoryRow);
  },

  async getHost(id: string): Promise<VisitorHost | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'visitor_host') return null;
    return toHost(row as MemoryRow);
  },

  async listHosts(organizationId: string, opts: ListHostsOpts = {}): Promise<VisitorHost[]> {
    const where: Record<string, unknown> = { organizationId, type: 'visitor_host' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toHost);
  },

  async updateHost(id: string, input: UpdateHostInput): Promise<VisitorHost | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['visitor_host', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toHost(row as MemoryRow);
  },

  async deleteHost(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async deactivateHost(id: string, _deactivatedBy: string): Promise<VisitorHost | null> {
    return VisitorManagementService.updateHost(id, { status: 'inactive' });
  },

  async unavailableHost(id: string, _markedBy: string): Promise<VisitorHost | null> {
    return VisitorManagementService.updateHost(id, { status: 'unavailable' });
  },

  // ── Access Logs ──

  async createAccessLog(organizationId: string, workspaceId: string, input: CreateAccessLogInput, createdBy: string): Promise<VisitorAccessLog> {
    const content = {
      visitId: input.visitId ?? null,
      badgeId: input.badgeId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'recorded',
      timestamp: input.timestamp ?? null,
      location: input.location ?? '',
      officer: input.officer ?? '',
      outcome: input.outcome ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'visitor_access_log',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.visitId ?? input.badgeId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['visitor_access_log', content.type, content.status]),
        createdBy,
      },
    });
    return toAccessLog(row as MemoryRow);
  },

  async getAccessLog(id: string): Promise<VisitorAccessLog | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'visitor_access_log') return null;
    return toAccessLog(row as MemoryRow);
  },

  async listAccessLogs(organizationId: string, opts: ListAccessLogsOpts = {}): Promise<VisitorAccessLog[]> {
    const where: Record<string, unknown> = { organizationId, type: 'visitor_access_log' };
    const conditions: unknown[] = [];
    if (opts.visitId) conditions.push({ content: { contains: `"visitId":"${opts.visitId}"` } });
    if (opts.badgeId) conditions.push({ content: { contains: `"badgeId":"${opts.badgeId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAccessLog);
  },

  async updateAccessLog(id: string, input: UpdateAccessLogInput): Promise<VisitorAccessLog | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.visitId !== undefined && { visitId: input.visitId }),
      ...(input.badgeId !== undefined && { badgeId: input.badgeId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.timestamp !== undefined && { timestamp: input.timestamp }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.officer !== undefined && { officer: input.officer }),
      ...(input.outcome !== undefined && { outcome: input.outcome }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['visitor_access_log', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAccessLog(row as MemoryRow);
  },

  async deleteAccessLog(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async reviewLog(id: string, _reviewedBy: string): Promise<VisitorAccessLog | null> {
    return VisitorManagementService.updateAccessLog(id, { status: 'reviewed' });
  },

  async flagLog(id: string, _flaggedBy: string): Promise<VisitorAccessLog | null> {
    return VisitorManagementService.updateAccessLog(id, { status: 'flagged' });
  },

  async archiveLog(id: string, _archivedBy: string): Promise<VisitorAccessLog | null> {
    return VisitorManagementService.updateAccessLog(id, { status: 'archived' });
  },

  // ── Metrics & Stats ──

  async getVisitorManagementMetrics(organizationId: string): Promise<VisitorManagementMetrics> {
    const [visits, badges, hosts, logs] = await Promise.all([
      VisitorManagementService.listVisits(organizationId),
      VisitorManagementService.listBadges(organizationId),
      VisitorManagementService.listHosts(organizationId),
      VisitorManagementService.listAccessLogs(organizationId),
    ]);
    return {
      preRegisteredVisits: visits.filter((v) => v.status === 'pre_registered').length,
      checkedInVisitors: visits.filter((v) => v.status === 'checked_in').length,
      activeBadges: badges.filter((b) => b.status === 'active').length,
      activeHosts: hosts.filter((h) => h.status === 'active').length,
      flaggedLogs: logs.filter((l) => l.status === 'flagged').length,
    };
  },

  async getVisitorManagementStats(organizationId: string): Promise<VisitorManagementStats> {
    const [visits, badges, hosts, logs] = await Promise.all([
      VisitorManagementService.listVisits(organizationId),
      VisitorManagementService.listBadges(organizationId),
      VisitorManagementService.listHosts(organizationId),
      VisitorManagementService.listAccessLogs(organizationId),
    ]);
    const byVisitType: Record<string, number> = {};
    const byVisitStatus: Record<string, number> = {};
    const byBadgeType: Record<string, number> = {};
    const byBadgeStatus: Record<string, number> = {};
    const byHostType: Record<string, number> = {};
    const byHostStatus: Record<string, number> = {};
    const byLogType: Record<string, number> = {};
    const byLogStatus: Record<string, number> = {};
    for (const v of visits) { byVisitType[v.type] = (byVisitType[v.type] ?? 0) + 1; byVisitStatus[v.status] = (byVisitStatus[v.status] ?? 0) + 1; }
    for (const b of badges) { byBadgeType[b.type] = (byBadgeType[b.type] ?? 0) + 1; byBadgeStatus[b.status] = (byBadgeStatus[b.status] ?? 0) + 1; }
    for (const h of hosts) { byHostType[h.type] = (byHostType[h.type] ?? 0) + 1; byHostStatus[h.status] = (byHostStatus[h.status] ?? 0) + 1; }
    for (const l of logs) { byLogType[l.type] = (byLogType[l.type] ?? 0) + 1; byLogStatus[l.status] = (byLogStatus[l.status] ?? 0) + 1; }
    return {
      visitCount: visits.length,
      badgeCount: badges.length,
      hostCount: hosts.length,
      logCount: logs.length,
      byVisitType, byVisitStatus, byBadgeType, byBadgeStatus, byHostType, byHostStatus, byLogType, byLogStatus,
    };
  },
};
