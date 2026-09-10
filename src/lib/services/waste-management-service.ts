import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type WasteStreamType = 'general' | 'recyclable' | 'organic' | 'hazardous' | 'electronic' | 'construction' | 'medical' | 'chemical';
export type WasteStreamStatus = 'active' | 'suspended' | 'deactivated' | 'draft' | 'pending';
export type RecyclingProgramType = 'paper' | 'plastic' | 'glass' | 'metal' | 'organic' | 'electronics' | 'textile' | 'compost';
export type RecyclingProgramStatus = 'planned' | 'active' | 'suspended' | 'completed' | 'archived';
export type WasteDisposalType = 'landfill' | 'recycling' | 'composting' | 'incineration' | 'hazardous' | 'donation' | 'reuse';
export type WasteDisposalStatus = 'scheduled' | 'executed' | 'cancelled' | 'verified' | 'pending';
export type WasteVendorType = 'recycler' | 'hauler' | 'composter' | 'hazardous' | 'electronic' | 'donation' | 'general';
export type WasteVendorStatus = 'active' | 'suspended' | 'terminated' | 'under_review' | 'pending';

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

export interface WasteStream {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: WasteStreamType;
  description: string;
  status: WasteStreamStatus;
  source: string;
  volume: number;
  unit: string;
  frequency: string;
  handler: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecyclingProgram {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RecyclingProgramType;
  description: string;
  status: RecyclingProgramStatus;
  startDate: Date | null;
  endDate: Date | null;
  targetVolume: number;
  actualVolume: number;
  unit: string;
  participants: number;
  coordinator: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WasteDisposal {
  id: string;
  organizationId: string;
  workspaceId: string;
  streamId: string | null;
  vendorId: string | null;
  type: WasteDisposalType;
  description: string;
  status: WasteDisposalStatus;
  volume: number;
  unit: string;
  scheduledDate: Date | null;
  executedDate: Date | null;
  cost: number;
  manifest: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WasteVendor {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: WasteVendorType;
  description: string;
  status: WasteVendorStatus;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  certification: string;
  rating: number;
  contractTerms: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WasteManagementMetrics {
  activeStreams: number;
  activePrograms: number;
  pendingDisposals: number;
  activeVendors: number;
  recycledVolume: number;
}

export interface WasteManagementStats {
  streamCount: number;
  programCount: number;
  disposalCount: number;
  vendorCount: number;
  byStreamType: Record<string, number>;
  byStreamStatus: Record<string, number>;
  byProgramType: Record<string, number>;
  byProgramStatus: Record<string, number>;
  byDisposalType: Record<string, number>;
  byDisposalStatus: Record<string, number>;
  byVendorType: Record<string, number>;
  byVendorStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateWasteStreamInput {
  name: string;
  type: WasteStreamType;
  description?: string;
  status?: WasteStreamStatus;
  source?: string;
  volume?: number;
  unit?: string;
  frequency?: string;
  handler?: string;
  notes?: string;
}

export interface UpdateWasteStreamInput {
  name?: string;
  type?: WasteStreamType;
  description?: string;
  status?: WasteStreamStatus;
  source?: string;
  volume?: number;
  unit?: string;
  frequency?: string;
  handler?: string;
  notes?: string;
}

export interface ListWasteStreamsOpts {
  type?: WasteStreamType;
  status?: WasteStreamStatus;
}

export interface CreateRecyclingProgramInput {
  name: string;
  type: RecyclingProgramType;
  description?: string;
  status?: RecyclingProgramStatus;
  startDate?: string;
  endDate?: string;
  targetVolume?: number;
  actualVolume?: number;
  unit?: string;
  participants?: number;
  coordinator?: string;
  notes?: string;
}

export interface UpdateRecyclingProgramInput {
  name?: string;
  type?: RecyclingProgramType;
  description?: string;
  status?: RecyclingProgramStatus;
  startDate?: string;
  endDate?: string;
  targetVolume?: number;
  actualVolume?: number;
  unit?: string;
  participants?: number;
  coordinator?: string;
  notes?: string;
}

export interface ListRecyclingProgramsOpts {
  type?: RecyclingProgramType;
  status?: RecyclingProgramStatus;
}

export interface CreateWasteDisposalInput {
  streamId?: string;
  vendorId?: string;
  type: WasteDisposalType;
  description?: string;
  status?: WasteDisposalStatus;
  volume?: number;
  unit?: string;
  scheduledDate?: string;
  executedDate?: string;
  cost?: number;
  manifest?: string;
  notes?: string;
}

export interface UpdateWasteDisposalInput {
  streamId?: string;
  vendorId?: string;
  type?: WasteDisposalType;
  description?: string;
  status?: WasteDisposalStatus;
  volume?: number;
  unit?: string;
  scheduledDate?: string;
  executedDate?: string;
  cost?: number;
  manifest?: string;
  notes?: string;
}

export interface ListWasteDisposalsOpts {
  streamId?: string;
  vendorId?: string;
  type?: WasteDisposalType;
  status?: WasteDisposalStatus;
}

export interface CreateWasteVendorInput {
  name: string;
  type: WasteVendorType;
  description?: string;
  status?: WasteVendorStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  certification?: string;
  rating?: number;
  contractTerms?: string;
  notes?: string;
}

export interface UpdateWasteVendorInput {
  name?: string;
  type?: WasteVendorType;
  description?: string;
  status?: WasteVendorStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  certification?: string;
  rating?: number;
  contractTerms?: string;
  notes?: string;
}

export interface ListWasteVendorsOpts {
  type?: WasteVendorType;
  status?: WasteVendorStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toWasteStream(row: MemoryRow): WasteStream {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as WasteStreamType) ?? 'general',
    description: (c.description as string) ?? '',
    status: (c.status as WasteStreamStatus) ?? 'draft',
    source: (c.source as string) ?? '',
    volume: (c.volume as number) ?? 0,
    unit: (c.unit as string) ?? '',
    frequency: (c.frequency as string) ?? '',
    handler: (c.handler as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRecyclingProgram(row: MemoryRow): RecyclingProgram {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RecyclingProgramType) ?? 'paper',
    description: (c.description as string) ?? '',
    status: (c.status as RecyclingProgramStatus) ?? 'planned',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    targetVolume: (c.targetVolume as number) ?? 0,
    actualVolume: (c.actualVolume as number) ?? 0,
    unit: (c.unit as string) ?? '',
    participants: (c.participants as number) ?? 0,
    coordinator: (c.coordinator as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toWasteDisposal(row: MemoryRow): WasteDisposal {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    streamId: (c.streamId as string) ?? null,
    vendorId: (c.vendorId as string) ?? null,
    type: (c.type as WasteDisposalType) ?? 'landfill',
    description: (c.description as string) ?? '',
    status: (c.status as WasteDisposalStatus) ?? 'pending',
    volume: (c.volume as number) ?? 0,
    unit: (c.unit as string) ?? '',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    executedDate: c.executedDate ? new Date(c.executedDate as string) : null,
    cost: (c.cost as number) ?? 0,
    manifest: (c.manifest as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toWasteVendor(row: MemoryRow): WasteVendor {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as WasteVendorType) ?? 'recycler',
    description: (c.description as string) ?? '',
    status: (c.status as WasteVendorStatus) ?? 'active',
    contactName: (c.contactName as string) ?? '',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    address: (c.address as string) ?? '',
    certification: (c.certification as string) ?? '',
    rating: (c.rating as number) ?? 0,
    contractTerms: (c.contractTerms as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const WasteManagementService = {
  // ── Waste Streams ──

  async createWasteStream(organizationId: string, workspaceId: string, input: CreateWasteStreamInput, createdBy: string): Promise<WasteStream> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      source: input.source ?? '',
      volume: input.volume ?? 0,
      unit: input.unit ?? '',
      frequency: input.frequency ?? '',
      handler: input.handler ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'waste_stream',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['waste_stream', content.type, content.status]),
        createdBy,
      },
    });
    return toWasteStream(row as MemoryRow);
  },

  async getWasteStream(id: string): Promise<WasteStream | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'waste_stream') return null;
    return toWasteStream(row as MemoryRow);
  },

  async listWasteStreams(organizationId: string, opts: ListWasteStreamsOpts = {}): Promise<WasteStream[]> {
    const where: Record<string, unknown> = { organizationId, type: 'waste_stream' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toWasteStream);
  },

  async updateWasteStream(id: string, input: UpdateWasteStreamInput): Promise<WasteStream | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.volume !== undefined && { volume: input.volume }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.handler !== undefined && { handler: input.handler }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['waste_stream', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toWasteStream(row as MemoryRow);
  },

  async deleteWasteStream(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateWasteStream(id: string, _activatedBy: string): Promise<WasteStream | null> {
    return WasteManagementService.updateWasteStream(id, { status: 'active' });
  },

  async suspendWasteStream(id: string, _suspendedBy: string): Promise<WasteStream | null> {
    return WasteManagementService.updateWasteStream(id, { status: 'suspended' });
  },

  async deactivateWasteStream(id: string, _deactivatedBy: string): Promise<WasteStream | null> {
    return WasteManagementService.updateWasteStream(id, { status: 'deactivated' });
  },

  // ── Recycling Programs ──

  async createRecyclingProgram(organizationId: string, workspaceId: string, input: CreateRecyclingProgramInput, createdBy: string): Promise<RecyclingProgram> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      targetVolume: input.targetVolume ?? 0,
      actualVolume: input.actualVolume ?? 0,
      unit: input.unit ?? '',
      participants: input.participants ?? 0,
      coordinator: input.coordinator ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'recycling_program',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['recycling_program', content.type, content.status]),
        createdBy,
      },
    });
    return toRecyclingProgram(row as MemoryRow);
  },

  async getRecyclingProgram(id: string): Promise<RecyclingProgram | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'recycling_program') return null;
    return toRecyclingProgram(row as MemoryRow);
  },

  async listRecyclingPrograms(organizationId: string, opts: ListRecyclingProgramsOpts = {}): Promise<RecyclingProgram[]> {
    const where: Record<string, unknown> = { organizationId, type: 'recycling_program' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRecyclingProgram);
  },

  async updateRecyclingProgram(id: string, input: UpdateRecyclingProgramInput): Promise<RecyclingProgram | null> {
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
      ...(input.targetVolume !== undefined && { targetVolume: input.targetVolume }),
      ...(input.actualVolume !== undefined && { actualVolume: input.actualVolume }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.participants !== undefined && { participants: input.participants }),
      ...(input.coordinator !== undefined && { coordinator: input.coordinator }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['recycling_program', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRecyclingProgram(row as MemoryRow);
  },

  async deleteRecyclingProgram(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async launchRecyclingProgram(id: string, _launchedBy: string): Promise<RecyclingProgram | null> {
    return WasteManagementService.updateRecyclingProgram(id, { status: 'active', startDate: new Date().toISOString() });
  },

  async suspendRecyclingProgram(id: string, _suspendedBy: string): Promise<RecyclingProgram | null> {
    return WasteManagementService.updateRecyclingProgram(id, { status: 'suspended' });
  },

  async completeRecyclingProgram(id: string, _completedBy: string): Promise<RecyclingProgram | null> {
    return WasteManagementService.updateRecyclingProgram(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  async archiveRecyclingProgram(id: string, _archivedBy: string): Promise<RecyclingProgram | null> {
    return WasteManagementService.updateRecyclingProgram(id, { status: 'archived' });
  },

  // ── Waste Disposals ──

  async createWasteDisposal(organizationId: string, workspaceId: string, input: CreateWasteDisposalInput, createdBy: string): Promise<WasteDisposal> {
    const content = {
      streamId: input.streamId ?? null,
      vendorId: input.vendorId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      volume: input.volume ?? 0,
      unit: input.unit ?? '',
      scheduledDate: input.scheduledDate ?? null,
      executedDate: input.executedDate ?? null,
      cost: input.cost ?? 0,
      manifest: input.manifest ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'waste_disposal',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.streamId ?? input.vendorId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['waste_disposal', content.type, content.status]),
        createdBy,
      },
    });
    return toWasteDisposal(row as MemoryRow);
  },

  async getWasteDisposal(id: string): Promise<WasteDisposal | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'waste_disposal') return null;
    return toWasteDisposal(row as MemoryRow);
  },

  async listWasteDisposals(organizationId: string, opts: ListWasteDisposalsOpts = {}): Promise<WasteDisposal[]> {
    const where: Record<string, unknown> = { organizationId, type: 'waste_disposal' };
    const conditions: unknown[] = [];
    if (opts.streamId) conditions.push({ content: { contains: `"streamId":"${opts.streamId}"` } });
    if (opts.vendorId) conditions.push({ content: { contains: `"vendorId":"${opts.vendorId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toWasteDisposal);
  },

  async updateWasteDisposal(id: string, input: UpdateWasteDisposalInput): Promise<WasteDisposal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.streamId !== undefined && { streamId: input.streamId }),
      ...(input.vendorId !== undefined && { vendorId: input.vendorId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.volume !== undefined && { volume: input.volume }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.executedDate !== undefined && { executedDate: input.executedDate }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.manifest !== undefined && { manifest: input.manifest }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['waste_disposal', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toWasteDisposal(row as MemoryRow);
  },

  async deleteWasteDisposal(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async scheduleWasteDisposal(id: string, _scheduledBy: string): Promise<WasteDisposal | null> {
    return WasteManagementService.updateWasteDisposal(id, { status: 'scheduled' });
  },

  async executeWasteDisposal(id: string, _executedBy: string): Promise<WasteDisposal | null> {
    return WasteManagementService.updateWasteDisposal(id, { status: 'executed', executedDate: new Date().toISOString() });
  },

  async cancelWasteDisposal(id: string, _cancelledBy: string): Promise<WasteDisposal | null> {
    return WasteManagementService.updateWasteDisposal(id, { status: 'cancelled' });
  },

  async verifyWasteDisposal(id: string, _verifiedBy: string): Promise<WasteDisposal | null> {
    return WasteManagementService.updateWasteDisposal(id, { status: 'verified' });
  },

  // ── Waste Vendors ──

  async createWasteVendor(organizationId: string, workspaceId: string, input: CreateWasteVendorInput, createdBy: string): Promise<WasteVendor> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      contactName: input.contactName ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      address: input.address ?? '',
      certification: input.certification ?? '',
      rating: input.rating ?? 0,
      contractTerms: input.contractTerms ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'waste_vendor',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['waste_vendor', content.type, content.status]),
        createdBy,
      },
    });
    return toWasteVendor(row as MemoryRow);
  },

  async getWasteVendor(id: string): Promise<WasteVendor | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'waste_vendor') return null;
    return toWasteVendor(row as MemoryRow);
  },

  async listWasteVendors(organizationId: string, opts: ListWasteVendorsOpts = {}): Promise<WasteVendor[]> {
    const where: Record<string, unknown> = { organizationId, type: 'waste_vendor' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toWasteVendor);
  },

  async updateWasteVendor(id: string, input: UpdateWasteVendorInput): Promise<WasteVendor | null> {
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
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.certification !== undefined && { certification: input.certification }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.contractTerms !== undefined && { contractTerms: input.contractTerms }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['waste_vendor', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toWasteVendor(row as MemoryRow);
  },

  async deleteWasteVendor(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateWasteVendor(id: string, _activatedBy: string): Promise<WasteVendor | null> {
    return WasteManagementService.updateWasteVendor(id, { status: 'active' });
  },

  async suspendWasteVendor(id: string, _suspendedBy: string): Promise<WasteVendor | null> {
    return WasteManagementService.updateWasteVendor(id, { status: 'suspended' });
  },

  async terminateWasteVendor(id: string, _terminatedBy: string): Promise<WasteVendor | null> {
    return WasteManagementService.updateWasteVendor(id, { status: 'terminated' });
  },

  async reviewWasteVendor(id: string, _reviewedBy: string): Promise<WasteVendor | null> {
    return WasteManagementService.updateWasteVendor(id, { status: 'under_review' });
  },

  // ── Metrics & Stats ──

  async getWasteManagementMetrics(organizationId: string): Promise<WasteManagementMetrics> {
    const [streams, programs, disposals, vendors] = await Promise.all([
      WasteManagementService.listWasteStreams(organizationId),
      WasteManagementService.listRecyclingPrograms(organizationId),
      WasteManagementService.listWasteDisposals(organizationId),
      WasteManagementService.listWasteVendors(organizationId),
    ]);
    return {
      activeStreams: streams.filter((s) => s.status === 'active').length,
      activePrograms: programs.filter((p) => p.status === 'active').length,
      pendingDisposals: disposals.filter((d) => d.status === 'pending' || d.status === 'scheduled').length,
      activeVendors: vendors.filter((v) => v.status === 'active').length,
      recycledVolume: programs.reduce((sum, p) => sum + (p.actualVolume ?? 0), 0),
    };
  },

  async getWasteManagementStats(organizationId: string): Promise<WasteManagementStats> {
    const [streams, programs, disposals, vendors] = await Promise.all([
      WasteManagementService.listWasteStreams(organizationId),
      WasteManagementService.listRecyclingPrograms(organizationId),
      WasteManagementService.listWasteDisposals(organizationId),
      WasteManagementService.listWasteVendors(organizationId),
    ]);
    const byStreamType: Record<string, number> = {};
    const byStreamStatus: Record<string, number> = {};
    const byProgramType: Record<string, number> = {};
    const byProgramStatus: Record<string, number> = {};
    const byDisposalType: Record<string, number> = {};
    const byDisposalStatus: Record<string, number> = {};
    const byVendorType: Record<string, number> = {};
    const byVendorStatus: Record<string, number> = {};
    for (const s of streams) { byStreamType[s.type] = (byStreamType[s.type] ?? 0) + 1; byStreamStatus[s.status] = (byStreamStatus[s.status] ?? 0) + 1; }
    for (const p of programs) { byProgramType[p.type] = (byProgramType[p.type] ?? 0) + 1; byProgramStatus[p.status] = (byProgramStatus[p.status] ?? 0) + 1; }
    for (const d of disposals) { byDisposalType[d.type] = (byDisposalType[d.type] ?? 0) + 1; byDisposalStatus[d.status] = (byDisposalStatus[d.status] ?? 0) + 1; }
    for (const v of vendors) { byVendorType[v.type] = (byVendorType[v.type] ?? 0) + 1; byVendorStatus[v.status] = (byVendorStatus[v.status] ?? 0) + 1; }
    return {
      streamCount: streams.length,
      programCount: programs.length,
      disposalCount: disposals.length,
      vendorCount: vendors.length,
      byStreamType, byStreamStatus, byProgramType, byProgramStatus, byDisposalType, byDisposalStatus, byVendorType, byVendorStatus,
    };
  },
};
