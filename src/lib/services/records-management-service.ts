import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ScheduleType = 'financial' | 'tax' | 'hr' | 'legal' | 'corporate' | 'operational' | 'compliance' | 'it' | 'marketing' | 'property' | 'insurance' | 'health_safety';
export type ScheduleStatus = 'draft' | 'active' | 'superseded' | 'archived' | 'under_review';
export type ItemType = 'paper' | 'electronic' | 'mixed' | 'audio' | 'video' | 'photographic' | 'microform' | 'physical_object';
export type ItemStatus = 'active' | 'inactive' | 'archived' | 'disposed' | 'on_hold' | 'transferred' | 'pending_review';
export type DisposalType = 'destruction' | 'transfer' | 'donation' | 'recycling' | 'return_to_origin' | 'shredding';
export type DisposalStatus = 'scheduled' | 'approved' | 'executed' | 'cancelled' | 'postponed' | 'verified';
export type HoldType = 'litigation' | 'regulatory' | 'investigation' | 'audit' | 'compliance' | 'internal';
export type HoldStatus = 'active' | 'released' | 'expired' | 'cancelled';

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

export interface RecordsSchedule {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ScheduleType;
  description: string;
  status: ScheduleStatus;
  retentionYears: number;
  retentionDays: number;
  triggerEvent: string;
  disposition: string;
  department: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordsItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: ItemType;
  description: string;
  status: ItemStatus;
  scheduleId: string | null;
  department: string;
  location: string;
  boxNumber: string;
  dateCreated: Date | null;
  dateInactive: Date | null;
  retentionEndDate: Date | null;
  restricted: boolean;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordsDisposal {
  id: string;
  organizationId: string;
  workspaceId: string;
  itemId: string;
  type: DisposalType;
  description: string;
  status: DisposalStatus;
  scheduledDate: Date | null;
  executedDate: Date | null;
  approvedBy: string;
  method: string;
  witness: string;
  certificate: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordsLegalHold {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: HoldType;
  description: string;
  status: HoldStatus;
  issuedBy: string;
  issuedDate: Date | null;
  releasedDate: Date | null;
  matterNumber: string;
  scope: string;
  affectedItems: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordsManagementMetrics {
  activeSchedules: number;
  activeItems: number;
  archivedItems: number;
  pendingDisposals: number;
  activeHolds: number;
}

export interface RecordsManagementStats {
  scheduleCount: number;
  itemCount: number;
  disposalCount: number;
  legalHoldCount: number;
  byScheduleType: Record<string, number>;
  byScheduleStatus: Record<string, number>;
  byItemType: Record<string, number>;
  byItemStatus: Record<string, number>;
  byDisposalType: Record<string, number>;
  byDisposalStatus: Record<string, number>;
  byHoldType: Record<string, number>;
  byHoldStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateScheduleInput {
  name: string;
  type: ScheduleType;
  description?: string;
  status?: ScheduleStatus;
  retentionYears?: number;
  retentionDays?: number;
  triggerEvent?: string;
  disposition?: string;
  department?: string;
  notes?: string;
}

export interface UpdateScheduleInput {
  name?: string;
  type?: ScheduleType;
  description?: string;
  status?: ScheduleStatus;
  retentionYears?: number;
  retentionDays?: number;
  triggerEvent?: string;
  disposition?: string;
  department?: string;
  notes?: string;
}

export interface ListSchedulesOpts {
  type?: ScheduleType;
  status?: ScheduleStatus;
}

export interface CreateItemInput {
  title: string;
  type: ItemType;
  description?: string;
  status?: ItemStatus;
  scheduleId?: string;
  department?: string;
  location?: string;
  boxNumber?: string;
  dateCreated?: string;
  dateInactive?: string;
  retentionEndDate?: string;
  restricted?: boolean;
  notes?: string;
}

export interface UpdateItemInput {
  title?: string;
  type?: ItemType;
  description?: string;
  status?: ItemStatus;
  scheduleId?: string;
  department?: string;
  location?: string;
  boxNumber?: string;
  dateCreated?: string;
  dateInactive?: string;
  retentionEndDate?: string;
  restricted?: boolean;
  notes?: string;
}

export interface ListItemsOpts {
  type?: ItemType;
  status?: ItemStatus;
  scheduleId?: string;
}

export interface CreateDisposalInput {
  itemId: string;
  type: DisposalType;
  description?: string;
  status?: DisposalStatus;
  scheduledDate?: string;
  executedDate?: string;
  approvedBy?: string;
  method?: string;
  witness?: string;
  certificate?: string;
  notes?: string;
}

export interface UpdateDisposalInput {
  itemId?: string;
  type?: DisposalType;
  description?: string;
  status?: DisposalStatus;
  scheduledDate?: string;
  executedDate?: string;
  approvedBy?: string;
  method?: string;
  witness?: string;
  certificate?: string;
  notes?: string;
}

export interface ListDisposalsOpts {
  itemId?: string;
  type?: DisposalType;
  status?: DisposalStatus;
}

export interface CreateLegalHoldInput {
  title: string;
  type: HoldType;
  description?: string;
  status?: HoldStatus;
  issuedBy?: string;
  issuedDate?: string;
  releasedDate?: string;
  matterNumber?: string;
  scope?: string;
  affectedItems?: string[];
  notes?: string;
}

export interface UpdateLegalHoldInput {
  title?: string;
  type?: HoldType;
  description?: string;
  status?: HoldStatus;
  issuedBy?: string;
  issuedDate?: string;
  releasedDate?: string;
  matterNumber?: string;
  scope?: string;
  affectedItems?: string[];
  notes?: string;
}

export interface ListLegalHoldsOpts {
  type?: HoldType;
  status?: HoldStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toSchedule(row: MemoryRow): RecordsSchedule {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ScheduleType) ?? 'corporate',
    description: (c.description as string) ?? '',
    status: (c.status as ScheduleStatus) ?? 'draft',
    retentionYears: (c.retentionYears as number) ?? 0,
    retentionDays: (c.retentionDays as number) ?? 0,
    triggerEvent: (c.triggerEvent as string) ?? '',
    disposition: (c.disposition as string) ?? '',
    department: (c.department as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toItem(row: MemoryRow): RecordsItem {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as ItemType) ?? 'paper',
    description: (c.description as string) ?? '',
    status: (c.status as ItemStatus) ?? 'active',
    scheduleId: (c.scheduleId as string) ?? null,
    department: (c.department as string) ?? '',
    location: (c.location as string) ?? '',
    boxNumber: (c.boxNumber as string) ?? '',
    dateCreated: c.dateCreated ? new Date(c.dateCreated as string) : null,
    dateInactive: c.dateInactive ? new Date(c.dateInactive as string) : null,
    retentionEndDate: c.retentionEndDate ? new Date(c.retentionEndDate as string) : null,
    restricted: (c.restricted as boolean) ?? false,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDisposal(row: MemoryRow): RecordsDisposal {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    itemId: (c.itemId as string) ?? '',
    type: (c.type as DisposalType) ?? 'destruction',
    description: (c.description as string) ?? '',
    status: (c.status as DisposalStatus) ?? 'scheduled',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    executedDate: c.executedDate ? new Date(c.executedDate as string) : null,
    approvedBy: (c.approvedBy as string) ?? '',
    method: (c.method as string) ?? '',
    witness: (c.witness as string) ?? '',
    certificate: (c.certificate as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toLegalHold(row: MemoryRow): RecordsLegalHold {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as HoldType) ?? 'litigation',
    description: (c.description as string) ?? '',
    status: (c.status as HoldStatus) ?? 'active',
    issuedBy: (c.issuedBy as string) ?? '',
    issuedDate: c.issuedDate ? new Date(c.issuedDate as string) : null,
    releasedDate: c.releasedDate ? new Date(c.releasedDate as string) : null,
    matterNumber: (c.matterNumber as string) ?? '',
    scope: (c.scope as string) ?? '',
    affectedItems: (c.affectedItems as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const RecordsManagementService = {
  // ── Schedules ──

  async createSchedule(organizationId: string, workspaceId: string, input: CreateScheduleInput, createdBy: string): Promise<RecordsSchedule> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      retentionYears: input.retentionYears ?? 0,
      retentionDays: input.retentionDays ?? 0,
      triggerEvent: input.triggerEvent ?? '',
      disposition: input.disposition ?? '',
      department: input.department ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'records_schedule',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['records_schedule', content.type, content.status]),
        createdBy,
      },
    });
    return toSchedule(row as MemoryRow);
  },

  async getSchedule(id: string): Promise<RecordsSchedule | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'records_schedule') return null;
    return toSchedule(row as MemoryRow);
  },

  async listSchedules(organizationId: string, opts: ListSchedulesOpts = {}): Promise<RecordsSchedule[]> {
    const where: Record<string, unknown> = { organizationId, type: 'records_schedule' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSchedule);
  },

  async updateSchedule(id: string, input: UpdateScheduleInput): Promise<RecordsSchedule | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.retentionYears !== undefined && { retentionYears: input.retentionYears }),
      ...(input.retentionDays !== undefined && { retentionDays: input.retentionDays }),
      ...(input.triggerEvent !== undefined && { triggerEvent: input.triggerEvent }),
      ...(input.disposition !== undefined && { disposition: input.disposition }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['records_schedule', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toSchedule(row as MemoryRow);
  },

  async deleteSchedule(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateSchedule(id: string, _activatedBy: string): Promise<RecordsSchedule | null> {
    return RecordsManagementService.updateSchedule(id, { status: 'active' });
  },

  async supersedeSchedule(id: string, _supersededBy: string): Promise<RecordsSchedule | null> {
    return RecordsManagementService.updateSchedule(id, { status: 'superseded' });
  },

  async reviewSchedule(id: string, _reviewedBy: string): Promise<RecordsSchedule | null> {
    return RecordsManagementService.updateSchedule(id, { status: 'under_review' });
  },

  async archiveSchedule(id: string, _archivedBy: string): Promise<RecordsSchedule | null> {
    return RecordsManagementService.updateSchedule(id, { status: 'archived' });
  },

  // ── Items ──

  async createItem(organizationId: string, workspaceId: string, input: CreateItemInput, createdBy: string): Promise<RecordsItem> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      scheduleId: input.scheduleId ?? null,
      department: input.department ?? '',
      location: input.location ?? '',
      boxNumber: input.boxNumber ?? '',
      dateCreated: input.dateCreated ?? null,
      dateInactive: input.dateInactive ?? null,
      retentionEndDate: input.retentionEndDate ?? null,
      restricted: input.restricted ?? false,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'records_item',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.scheduleId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['records_item', content.type, content.status]),
        createdBy,
      },
    });
    return toItem(row as MemoryRow);
  },

  async getItem(id: string): Promise<RecordsItem | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'records_item') return null;
    return toItem(row as MemoryRow);
  },

  async listItems(organizationId: string, opts: ListItemsOpts = {}): Promise<RecordsItem[]> {
    const where: Record<string, unknown> = { organizationId, type: 'records_item' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.scheduleId) conditions.push({ content: { contains: `"scheduleId":"${opts.scheduleId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toItem);
  },

  async updateItem(id: string, input: UpdateItemInput): Promise<RecordsItem | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduleId !== undefined && { scheduleId: input.scheduleId }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.boxNumber !== undefined && { boxNumber: input.boxNumber }),
      ...(input.dateCreated !== undefined && { dateCreated: input.dateCreated }),
      ...(input.dateInactive !== undefined && { dateInactive: input.dateInactive }),
      ...(input.retentionEndDate !== undefined && { retentionEndDate: input.retentionEndDate }),
      ...(input.restricted !== undefined && { restricted: input.restricted }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['records_item', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toItem(row as MemoryRow);
  },

  async deleteItem(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async archiveItem(id: string, _archivedBy: string): Promise<RecordsItem | null> {
    return RecordsManagementService.updateItem(id, { status: 'archived' });
  },

  async disposeItem(id: string, _disposedBy: string): Promise<RecordsItem | null> {
    return RecordsManagementService.updateItem(id, { status: 'disposed' });
  },

  async holdItem(id: string, _holdBy: string): Promise<RecordsItem | null> {
    return RecordsManagementService.updateItem(id, { status: 'on_hold' });
  },

  async transferItem(id: string, _transferredBy: string): Promise<RecordsItem | null> {
    return RecordsManagementService.updateItem(id, { status: 'transferred' });
  },

  async reviewItem(id: string, _reviewedBy: string): Promise<RecordsItem | null> {
    return RecordsManagementService.updateItem(id, { status: 'pending_review' });
  },

  // ── Disposals ──

  async createDisposal(organizationId: string, workspaceId: string, input: CreateDisposalInput, createdBy: string): Promise<RecordsDisposal> {
    const content = {
      itemId: input.itemId,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      scheduledDate: input.scheduledDate ?? null,
      executedDate: input.executedDate ?? null,
      approvedBy: input.approvedBy ?? '',
      method: input.method ?? '',
      witness: input.witness ?? '',
      certificate: input.certificate ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'records_disposal',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.itemId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['records_disposal', content.type, content.status]),
        createdBy,
      },
    });
    return toDisposal(row as MemoryRow);
  },

  async getDisposal(id: string): Promise<RecordsDisposal | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'records_disposal') return null;
    return toDisposal(row as MemoryRow);
  },

  async listDisposals(organizationId: string, opts: ListDisposalsOpts = {}): Promise<RecordsDisposal[]> {
    const where: Record<string, unknown> = { organizationId, type: 'records_disposal' };
    const conditions: unknown[] = [];
    if (opts.itemId) conditions.push({ content: { contains: `"itemId":"${opts.itemId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toDisposal);
  },

  async updateDisposal(id: string, input: UpdateDisposalInput): Promise<RecordsDisposal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.itemId !== undefined && { itemId: input.itemId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.executedDate !== undefined && { executedDate: input.executedDate }),
      ...(input.approvedBy !== undefined && { approvedBy: input.approvedBy }),
      ...(input.method !== undefined && { method: input.method }),
      ...(input.witness !== undefined && { witness: input.witness }),
      ...(input.certificate !== undefined && { certificate: input.certificate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['records_disposal', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toDisposal(row as MemoryRow);
  },

  async deleteDisposal(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveDisposal(id: string, approvedBy: string): Promise<RecordsDisposal | null> {
    const d = await RecordsManagementService.updateDisposal(id, { status: 'approved', approvedBy });
    if (!d) return null;
    await safePrisma(() => prisma.memory.update({ where: { id }, data: { verifiedBy: approvedBy } }), null);
    return d;
  },

  async executeDisposal(id: string, _executedBy: string): Promise<RecordsDisposal | null> {
    return RecordsManagementService.updateDisposal(id, { status: 'executed', executedDate: new Date().toISOString() });
  },

  async cancelDisposal(id: string, _cancelledBy: string): Promise<RecordsDisposal | null> {
    return RecordsManagementService.updateDisposal(id, { status: 'cancelled' });
  },

  async postponeDisposal(id: string, _postponedBy: string): Promise<RecordsDisposal | null> {
    return RecordsManagementService.updateDisposal(id, { status: 'postponed' });
  },

  async verifyDisposal(id: string, verifiedBy: string): Promise<RecordsDisposal | null> {
    const d = await RecordsManagementService.updateDisposal(id, { status: 'verified' });
    if (!d) return null;
    await safePrisma(() => prisma.memory.update({ where: { id }, data: { verifiedBy, verifiedAt: new Date() } }), null);
    return d;
  },

  // ── Legal Holds ──

  async createLegalHold(organizationId: string, workspaceId: string, input: CreateLegalHoldInput, createdBy: string): Promise<RecordsLegalHold> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      issuedBy: input.issuedBy ?? '',
      issuedDate: input.issuedDate ?? null,
      releasedDate: input.releasedDate ?? null,
      matterNumber: input.matterNumber ?? '',
      scope: input.scope ?? '',
      affectedItems: input.affectedItems ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'records_legal_hold',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['records_legal_hold', content.type, content.status]),
        createdBy,
      },
    });
    return toLegalHold(row as MemoryRow);
  },

  async getLegalHold(id: string): Promise<RecordsLegalHold | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'records_legal_hold') return null;
    return toLegalHold(row as MemoryRow);
  },

  async listLegalHolds(organizationId: string, opts: ListLegalHoldsOpts = {}): Promise<RecordsLegalHold[]> {
    const where: Record<string, unknown> = { organizationId, type: 'records_legal_hold' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toLegalHold);
  },

  async updateLegalHold(id: string, input: UpdateLegalHoldInput): Promise<RecordsLegalHold | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.issuedBy !== undefined && { issuedBy: input.issuedBy }),
      ...(input.issuedDate !== undefined && { issuedDate: input.issuedDate }),
      ...(input.releasedDate !== undefined && { releasedDate: input.releasedDate }),
      ...(input.matterNumber !== undefined && { matterNumber: input.matterNumber }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.affectedItems !== undefined && { affectedItems: input.affectedItems }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['records_legal_hold', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toLegalHold(row as MemoryRow);
  },

  async deleteLegalHold(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async releaseHold(id: string, _releasedBy: string): Promise<RecordsLegalHold | null> {
    return RecordsManagementService.updateLegalHold(id, { status: 'released', releasedDate: new Date().toISOString() });
  },

  async expireHold(id: string, _expiredBy: string): Promise<RecordsLegalHold | null> {
    return RecordsManagementService.updateLegalHold(id, { status: 'expired' });
  },

  async cancelHold(id: string, _cancelledBy: string): Promise<RecordsLegalHold | null> {
    return RecordsManagementService.updateLegalHold(id, { status: 'cancelled' });
  },

  // ── Metrics & Stats ──

  async getRecordsManagementMetrics(organizationId: string): Promise<RecordsManagementMetrics> {
    const [schedules, items, disposals, holds] = await Promise.all([
      RecordsManagementService.listSchedules(organizationId),
      RecordsManagementService.listItems(organizationId),
      RecordsManagementService.listDisposals(organizationId),
      RecordsManagementService.listLegalHolds(organizationId),
    ]);
    return {
      activeSchedules: schedules.filter((s) => s.status === 'active').length,
      activeItems: items.filter((i) => i.status === 'active').length,
      archivedItems: items.filter((i) => i.status === 'archived').length,
      pendingDisposals: disposals.filter((d) => d.status === 'scheduled' || d.status === 'approved').length,
      activeHolds: holds.filter((h) => h.status === 'active').length,
    };
  },

  async getRecordsManagementStats(organizationId: string): Promise<RecordsManagementStats> {
    const [schedules, items, disposals, holds] = await Promise.all([
      RecordsManagementService.listSchedules(organizationId),
      RecordsManagementService.listItems(organizationId),
      RecordsManagementService.listDisposals(organizationId),
      RecordsManagementService.listLegalHolds(organizationId),
    ]);
    const byScheduleType: Record<string, number> = {};
    const byScheduleStatus: Record<string, number> = {};
    const byItemType: Record<string, number> = {};
    const byItemStatus: Record<string, number> = {};
    const byDisposalType: Record<string, number> = {};
    const byDisposalStatus: Record<string, number> = {};
    const byHoldType: Record<string, number> = {};
    const byHoldStatus: Record<string, number> = {};
    for (const s of schedules) { byScheduleType[s.type] = (byScheduleType[s.type] ?? 0) + 1; byScheduleStatus[s.status] = (byScheduleStatus[s.status] ?? 0) + 1; }
    for (const i of items) { byItemType[i.type] = (byItemType[i.type] ?? 0) + 1; byItemStatus[i.status] = (byItemStatus[i.status] ?? 0) + 1; }
    for (const d of disposals) { byDisposalType[d.type] = (byDisposalType[d.type] ?? 0) + 1; byDisposalStatus[d.status] = (byDisposalStatus[d.status] ?? 0) + 1; }
    for (const h of holds) { byHoldType[h.type] = (byHoldType[h.type] ?? 0) + 1; byHoldStatus[h.status] = (byHoldStatus[h.status] ?? 0) + 1; }
    return {
      scheduleCount: schedules.length,
      itemCount: items.length,
      disposalCount: disposals.length,
      legalHoldCount: holds.length,
      byScheduleType, byScheduleStatus, byItemType, byItemStatus, byDisposalType, byDisposalStatus, byHoldType, byHoldStatus,
    };
  },
};
