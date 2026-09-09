import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type CarbonInventoryType = 'scope1' | 'scope2' | 'scope3' | 'facility' | 'fleet' | 'operations' | 'supply_chain' | 'product';
export type CarbonInventoryStatus = 'draft' | 'active' | 'archived' | 'pending';
export type CarbonOffsetType = 'reforestation' | 'renewable_energy' | 'methane_capture' | 'energy_efficiency' | 'carbon_credits' | 'direct_air_capture' | 'afforestation' | 'blue_carbon';
export type CarbonOffsetStatus = 'planned' | 'active' | 'verified' | 'retired' | 'cancelled';
export type CarbonTargetType = 'absolute' | 'intensity' | 'net_zero' | 'science_based' | 'offset_based';
export type CarbonTargetStatus = 'draft' | 'approved' | 'active' | 'achieved' | 'missed' | 'reviewed';
export type CarbonCreditType = 'verra' | 'gold_standard' | 'car' | 'american_carbon_registry' | 'plan_vivo' | 'climate_action_reserve';
export type CarbonCreditStatus = 'held' | 'sold' | 'retired' | 'pending' | 'expired';

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

export interface CarbonInventory {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CarbonInventoryType;
  description: string;
  status: CarbonInventoryStatus;
  period: string;
  emissions: number;
  unit: string;
  source: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarbonOffset {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CarbonOffsetType;
  description: string;
  status: CarbonOffsetStatus;
  provider: string;
  amount: number;
  unit: string;
  cost: number;
  certification: string;
  retirementDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarbonTarget {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CarbonTargetType;
  description: string;
  status: CarbonTargetStatus;
  baselineYear: number;
  targetYear: number;
  baselineValue: number;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarbonCredit {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CarbonCreditType;
  description: string;
  status: CarbonCreditStatus;
  serialNumber: string;
  amount: number;
  unit: string;
  price: number;
  vintage: number;
  project: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarbonManagementMetrics {
  activeInventories: number;
  activeOffsets: number;
  activeTargets: number;
  heldCredits: number;
  totalOffsetAmount: number;
}

export interface CarbonManagementStats {
  inventoryCount: number;
  offsetCount: number;
  targetCount: number;
  creditCount: number;
  byInventoryType: Record<string, number>;
  byInventoryStatus: Record<string, number>;
  byOffsetType: Record<string, number>;
  byOffsetStatus: Record<string, number>;
  byTargetType: Record<string, number>;
  byTargetStatus: Record<string, number>;
  byCreditType: Record<string, number>;
  byCreditStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateCarbonInventoryInput {
  name: string;
  type: CarbonInventoryType;
  description?: string;
  status?: CarbonInventoryStatus;
  period?: string;
  emissions?: number;
  unit?: string;
  source?: string;
  notes?: string;
}

export interface UpdateCarbonInventoryInput {
  name?: string;
  type?: CarbonInventoryType;
  description?: string;
  status?: CarbonInventoryStatus;
  period?: string;
  emissions?: number;
  unit?: string;
  source?: string;
  notes?: string;
}

export interface ListCarbonInventoriesOpts {
  type?: CarbonInventoryType;
  status?: CarbonInventoryStatus;
}

export interface CreateCarbonOffsetInput {
  name: string;
  type: CarbonOffsetType;
  description?: string;
  status?: CarbonOffsetStatus;
  provider?: string;
  amount?: number;
  unit?: string;
  cost?: number;
  certification?: string;
  retirementDate?: string;
  notes?: string;
}

export interface UpdateCarbonOffsetInput {
  name?: string;
  type?: CarbonOffsetType;
  description?: string;
  status?: CarbonOffsetStatus;
  provider?: string;
  amount?: number;
  unit?: string;
  cost?: number;
  certification?: string;
  retirementDate?: string;
  notes?: string;
}

export interface ListCarbonOffsetsOpts {
  type?: CarbonOffsetType;
  status?: CarbonOffsetStatus;
}

export interface CreateCarbonTargetInput {
  name: string;
  type: CarbonTargetType;
  description?: string;
  status?: CarbonTargetStatus;
  baselineYear?: number;
  targetYear?: number;
  baselineValue?: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  progress?: number;
  notes?: string;
}

export interface UpdateCarbonTargetInput {
  name?: string;
  type?: CarbonTargetType;
  description?: string;
  status?: CarbonTargetStatus;
  baselineYear?: number;
  targetYear?: number;
  baselineValue?: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  progress?: number;
  notes?: string;
}

export interface ListCarbonTargetsOpts {
  type?: CarbonTargetType;
  status?: CarbonTargetStatus;
}

export interface CreateCarbonCreditInput {
  name: string;
  type: CarbonCreditType;
  description?: string;
  status?: CarbonCreditStatus;
  serialNumber?: string;
  amount?: number;
  unit?: string;
  price?: number;
  vintage?: number;
  project?: string;
  notes?: string;
}

export interface UpdateCarbonCreditInput {
  name?: string;
  type?: CarbonCreditType;
  description?: string;
  status?: CarbonCreditStatus;
  serialNumber?: string;
  amount?: number;
  unit?: string;
  price?: number;
  vintage?: number;
  project?: string;
  notes?: string;
}

export interface ListCarbonCreditsOpts {
  type?: CarbonCreditType;
  status?: CarbonCreditStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toCarbonInventory(row: MemoryRow): CarbonInventory {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CarbonInventoryType) ?? 'scope1',
    description: (c.description as string) ?? '',
    status: (c.status as CarbonInventoryStatus) ?? 'draft',
    period: (c.period as string) ?? '',
    emissions: (c.emissions as number) ?? 0,
    unit: (c.unit as string) ?? '',
    source: (c.source as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCarbonOffset(row: MemoryRow): CarbonOffset {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CarbonOffsetType) ?? 'reforestation',
    description: (c.description as string) ?? '',
    status: (c.status as CarbonOffsetStatus) ?? 'planned',
    provider: (c.provider as string) ?? '',
    amount: (c.amount as number) ?? 0,
    unit: (c.unit as string) ?? '',
    cost: (c.cost as number) ?? 0,
    certification: (c.certification as string) ?? '',
    retirementDate: c.retirementDate ? new Date(c.retirementDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCarbonTarget(row: MemoryRow): CarbonTarget {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CarbonTargetType) ?? 'absolute',
    description: (c.description as string) ?? '',
    status: (c.status as CarbonTargetStatus) ?? 'draft',
    baselineYear: (c.baselineYear as number) ?? 0,
    targetYear: (c.targetYear as number) ?? 0,
    baselineValue: (c.baselineValue as number) ?? 0,
    targetValue: (c.targetValue as number) ?? 0,
    currentValue: (c.currentValue as number) ?? 0,
    unit: (c.unit as string) ?? '',
    progress: (c.progress as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCarbonCredit(row: MemoryRow): CarbonCredit {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CarbonCreditType) ?? 'verra',
    description: (c.description as string) ?? '',
    status: (c.status as CarbonCreditStatus) ?? 'held',
    serialNumber: (c.serialNumber as string) ?? '',
    amount: (c.amount as number) ?? 0,
    unit: (c.unit as string) ?? '',
    price: (c.price as number) ?? 0,
    vintage: (c.vintage as number) ?? 0,
    project: (c.project as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const CarbonManagementService = {
  // ── Carbon Inventories ──

  async createCarbonInventory(organizationId: string, workspaceId: string, input: CreateCarbonInventoryInput, createdBy: string): Promise<CarbonInventory> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      period: input.period ?? '',
      emissions: input.emissions ?? 0,
      unit: input.unit ?? '',
      source: input.source ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'carbon_inventory',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['carbon_inventory', content.type, content.status]),
        createdBy,
      },
    });
    return toCarbonInventory(row as MemoryRow);
  },

  async getCarbonInventory(id: string): Promise<CarbonInventory | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'carbon_inventory') return null;
    return toCarbonInventory(row as MemoryRow);
  },

  async listCarbonInventories(organizationId: string, opts: ListCarbonInventoriesOpts = {}): Promise<CarbonInventory[]> {
    const where: Record<string, unknown> = { organizationId, type: 'carbon_inventory' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCarbonInventory);
  },

  async updateCarbonInventory(id: string, input: UpdateCarbonInventoryInput): Promise<CarbonInventory | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.emissions !== undefined && { emissions: input.emissions }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['carbon_inventory', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCarbonInventory(row as MemoryRow);
  },

  async deleteCarbonInventory(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateCarbonInventory(id: string, _activatedBy: string): Promise<CarbonInventory | null> {
    return CarbonManagementService.updateCarbonInventory(id, { status: 'active' });
  },

  async archiveCarbonInventory(id: string, _archivedBy: string): Promise<CarbonInventory | null> {
    return CarbonManagementService.updateCarbonInventory(id, { status: 'archived' });
  },

  async reviewCarbonInventory(id: string, _reviewedBy: string): Promise<CarbonInventory | null> {
    return CarbonManagementService.updateCarbonInventory(id, { status: 'pending' });
  },

  // ── Carbon Offsets ──

  async createCarbonOffset(organizationId: string, workspaceId: string, input: CreateCarbonOffsetInput, createdBy: string): Promise<CarbonOffset> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      provider: input.provider ?? '',
      amount: input.amount ?? 0,
      unit: input.unit ?? '',
      cost: input.cost ?? 0,
      certification: input.certification ?? '',
      retirementDate: input.retirementDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'carbon_offset',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['carbon_offset', content.type, content.status]),
        createdBy,
      },
    });
    return toCarbonOffset(row as MemoryRow);
  },

  async getCarbonOffset(id: string): Promise<CarbonOffset | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'carbon_offset') return null;
    return toCarbonOffset(row as MemoryRow);
  },

  async listCarbonOffsets(organizationId: string, opts: ListCarbonOffsetsOpts = {}): Promise<CarbonOffset[]> {
    const where: Record<string, unknown> = { organizationId, type: 'carbon_offset' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCarbonOffset);
  },

  async updateCarbonOffset(id: string, input: UpdateCarbonOffsetInput): Promise<CarbonOffset | null> {
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
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.certification !== undefined && { certification: input.certification }),
      ...(input.retirementDate !== undefined && { retirementDate: input.retirementDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['carbon_offset', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCarbonOffset(row as MemoryRow);
  },

  async deleteCarbonOffset(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateCarbonOffset(id: string, _activatedBy: string): Promise<CarbonOffset | null> {
    return CarbonManagementService.updateCarbonOffset(id, { status: 'active' });
  },

  async verifyCarbonOffset(id: string, _verifiedBy: string): Promise<CarbonOffset | null> {
    return CarbonManagementService.updateCarbonOffset(id, { status: 'verified' });
  },

  async retireCarbonOffset(id: string, _retiredBy: string): Promise<CarbonOffset | null> {
    return CarbonManagementService.updateCarbonOffset(id, { status: 'retired', retirementDate: new Date().toISOString() });
  },

  async cancelCarbonOffset(id: string, _cancelledBy: string): Promise<CarbonOffset | null> {
    return CarbonManagementService.updateCarbonOffset(id, { status: 'cancelled' });
  },

  // ── Carbon Targets ──

  async createCarbonTarget(organizationId: string, workspaceId: string, input: CreateCarbonTargetInput, createdBy: string): Promise<CarbonTarget> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      baselineYear: input.baselineYear ?? 0,
      targetYear: input.targetYear ?? 0,
      baselineValue: input.baselineValue ?? 0,
      targetValue: input.targetValue ?? 0,
      currentValue: input.currentValue ?? 0,
      unit: input.unit ?? '',
      progress: input.progress ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'carbon_target',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['carbon_target', content.type, content.status]),
        createdBy,
      },
    });
    return toCarbonTarget(row as MemoryRow);
  },

  async getCarbonTarget(id: string): Promise<CarbonTarget | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'carbon_target') return null;
    return toCarbonTarget(row as MemoryRow);
  },

  async listCarbonTargets(organizationId: string, opts: ListCarbonTargetsOpts = {}): Promise<CarbonTarget[]> {
    const where: Record<string, unknown> = { organizationId, type: 'carbon_target' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCarbonTarget);
  },

  async updateCarbonTarget(id: string, input: UpdateCarbonTargetInput): Promise<CarbonTarget | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.baselineYear !== undefined && { baselineYear: input.baselineYear }),
      ...(input.targetYear !== undefined && { targetYear: input.targetYear }),
      ...(input.baselineValue !== undefined && { baselineValue: input.baselineValue }),
      ...(input.targetValue !== undefined && { targetValue: input.targetValue }),
      ...(input.currentValue !== undefined && { currentValue: input.currentValue }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['carbon_target', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCarbonTarget(row as MemoryRow);
  },

  async deleteCarbonTarget(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveCarbonTarget(id: string, _approvedBy: string): Promise<CarbonTarget | null> {
    return CarbonManagementService.updateCarbonTarget(id, { status: 'approved' });
  },

  async activateCarbonTarget(id: string, _activatedBy: string): Promise<CarbonTarget | null> {
    return CarbonManagementService.updateCarbonTarget(id, { status: 'active' });
  },

  async achieveCarbonTarget(id: string, _achievedBy: string): Promise<CarbonTarget | null> {
    return CarbonManagementService.updateCarbonTarget(id, { status: 'achieved' });
  },

  async missCarbonTarget(id: string, _missedBy: string): Promise<CarbonTarget | null> {
    return CarbonManagementService.updateCarbonTarget(id, { status: 'missed' });
  },

  async reviewCarbonTarget(id: string, _reviewedBy: string): Promise<CarbonTarget | null> {
    return CarbonManagementService.updateCarbonTarget(id, { status: 'reviewed' });
  },

  // ── Carbon Credits ──

  async createCarbonCredit(organizationId: string, workspaceId: string, input: CreateCarbonCreditInput, createdBy: string): Promise<CarbonCredit> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'held',
      serialNumber: input.serialNumber ?? '',
      amount: input.amount ?? 0,
      unit: input.unit ?? '',
      price: input.price ?? 0,
      vintage: input.vintage ?? 0,
      project: input.project ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'carbon_credit',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['carbon_credit', content.type, content.status]),
        createdBy,
      },
    });
    return toCarbonCredit(row as MemoryRow);
  },

  async getCarbonCredit(id: string): Promise<CarbonCredit | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'carbon_credit') return null;
    return toCarbonCredit(row as MemoryRow);
  },

  async listCarbonCredits(organizationId: string, opts: ListCarbonCreditsOpts = {}): Promise<CarbonCredit[]> {
    const where: Record<string, unknown> = { organizationId, type: 'carbon_credit' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCarbonCredit);
  },

  async updateCarbonCredit(id: string, input: UpdateCarbonCreditInput): Promise<CarbonCredit | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.serialNumber !== undefined && { serialNumber: input.serialNumber }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.vintage !== undefined && { vintage: input.vintage }),
      ...(input.project !== undefined && { project: input.project }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['carbon_credit', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCarbonCredit(row as MemoryRow);
  },

  async deleteCarbonCredit(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async sellCarbonCredit(id: string, _soldBy: string): Promise<CarbonCredit | null> {
    return CarbonManagementService.updateCarbonCredit(id, { status: 'sold' });
  },

  async retireCarbonCredit(id: string, _retiredBy: string): Promise<CarbonCredit | null> {
    return CarbonManagementService.updateCarbonCredit(id, { status: 'retired' });
  },

  async expireCarbonCredit(id: string, _expiredBy: string): Promise<CarbonCredit | null> {
    return CarbonManagementService.updateCarbonCredit(id, { status: 'expired' });
  },

  async holdCarbonCredit(id: string, _heldBy: string): Promise<CarbonCredit | null> {
    return CarbonManagementService.updateCarbonCredit(id, { status: 'held' });
  },

  // ── Metrics & Stats ──

  async getCarbonManagementMetrics(organizationId: string): Promise<CarbonManagementMetrics> {
    const [inventories, offsets, targets, credits] = await Promise.all([
      CarbonManagementService.listCarbonInventories(organizationId),
      CarbonManagementService.listCarbonOffsets(organizationId),
      CarbonManagementService.listCarbonTargets(organizationId),
      CarbonManagementService.listCarbonCredits(organizationId),
    ]);
    return {
      activeInventories: inventories.filter((i) => i.status === 'active').length,
      activeOffsets: offsets.filter((o) => o.status === 'active').length,
      activeTargets: targets.filter((t) => t.status === 'active').length,
      heldCredits: credits.filter((c) => c.status === 'held').length,
      totalOffsetAmount: offsets.reduce((sum, o) => sum + (o.amount ?? 0), 0),
    };
  },

  async getCarbonManagementStats(organizationId: string): Promise<CarbonManagementStats> {
    const [inventories, offsets, targets, credits] = await Promise.all([
      CarbonManagementService.listCarbonInventories(organizationId),
      CarbonManagementService.listCarbonOffsets(organizationId),
      CarbonManagementService.listCarbonTargets(organizationId),
      CarbonManagementService.listCarbonCredits(organizationId),
    ]);
    const byInventoryType: Record<string, number> = {};
    const byInventoryStatus: Record<string, number> = {};
    const byOffsetType: Record<string, number> = {};
    const byOffsetStatus: Record<string, number> = {};
    const byTargetType: Record<string, number> = {};
    const byTargetStatus: Record<string, number> = {};
    const byCreditType: Record<string, number> = {};
    const byCreditStatus: Record<string, number> = {};
    for (const i of inventories) { byInventoryType[i.type] = (byInventoryType[i.type] ?? 0) + 1; byInventoryStatus[i.status] = (byInventoryStatus[i.status] ?? 0) + 1; }
    for (const o of offsets) { byOffsetType[o.type] = (byOffsetType[o.type] ?? 0) + 1; byOffsetStatus[o.status] = (byOffsetStatus[o.status] ?? 0) + 1; }
    for (const t of targets) { byTargetType[t.type] = (byTargetType[t.type] ?? 0) + 1; byTargetStatus[t.status] = (byTargetStatus[t.status] ?? 0) + 1; }
    for (const c of credits) { byCreditType[c.type] = (byCreditType[c.type] ?? 0) + 1; byCreditStatus[c.status] = (byCreditStatus[c.status] ?? 0) + 1; }
    return {
      inventoryCount: inventories.length,
      offsetCount: offsets.length,
      targetCount: targets.length,
      creditCount: credits.length,
      byInventoryType, byInventoryStatus, byOffsetType, byOffsetStatus, byTargetType, byTargetStatus, byCreditType, byCreditStatus,
    };
  },
};
