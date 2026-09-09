import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type UnitType = 'single' | 'multi_unit' | 'master' | 'area_developer' | 'conversion';
export type UnitStatus = 'prospective' | 'approved' | 'active' | 'suspended' | 'terminated' | 'expired' | 'sold';
export type AgreementType = 'franchise' | 'master_franchise' | 'area_development' | 'non_traditional' | 'conversion' | 'renewal';
export type AgreementStatus = 'draft' | 'pending' | 'executed' | 'active' | 'expired' | 'terminated' | 'renewed' | 'amended';
export type RoyaltyType = 'percentage' | 'fixed' | 'tiered' | 'minimum' | 'ad_fund' | 'technology_fee';
export type RoyaltyStatus = 'accrued' | 'billed' | 'paid' | 'overdue' | 'waived' | 'disputed';
export type TrainingType = 'initial' | 'ongoing' | 'refresher' | 'certification' | 'compliance' | 'leadership' | 'operations';
export type TrainingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

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

export interface FranchiseUnit {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: UnitType;
  description: string;
  status: UnitStatus;
  franchiseeName: string;
  location: string;
  territory: string;
  openedDate: Date | null;
  closedDate: Date | null;
  initialFee: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FranchiseAgreement {
  id: string;
  organizationId: string;
  workspaceId: string;
  unitId: string;
  franchiseeName: string;
  type: AgreementType;
  description: string;
  status: AgreementStatus;
  startDate: Date | null;
  endDate: Date | null;
  territory: string;
  initialFee: number;
  royaltyRate: number;
  advertisingFee: number;
  termYears: number;
  renewalTerms: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FranchiseRoyalty {
  id: string;
  organizationId: string;
  workspaceId: string;
  unitId: string;
  agreementId: string;
  type: RoyaltyType;
  amount: number;
  currency: string;
  description: string;
  status: RoyaltyStatus;
  period: string;
  dueDate: Date | null;
  paidDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FranchiseTraining {
  id: string;
  organizationId: string;
  workspaceId: string;
  unitId: string;
  franchiseeName: string;
  type: TrainingType;
  description: string;
  status: TrainingStatus;
  scheduledDate: Date | null;
  completedDate: Date | null;
  trainer: string;
  location: string;
  attendees: string[];
  certifications: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FranchiseDevelopmentMetrics {
  activeUnits: number;
  executedAgreements: number;
  pendingRoyalties: number;
  overdueRoyalties: number;
  scheduledTraining: number;
}

export interface FranchiseDevelopmentStats {
  unitCount: number;
  activeUnitCount: number;
  agreementCount: number;
  executedAgreementCount: number;
  royaltyCount: number;
  pendingRoyaltyCount: number;
  trainingCount: number;
  scheduledTrainingCount: number;
  byUnitType: Record<string, number>;
  byUnitStatus: Record<string, number>;
  byAgreementType: Record<string, number>;
  byAgreementStatus: Record<string, number>;
  byRoyaltyType: Record<string, number>;
  byRoyaltyStatus: Record<string, number>;
  byTrainingType: Record<string, number>;
  byTrainingStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateUnitInput {
  name: string;
  type: UnitType;
  description?: string;
  status?: UnitStatus;
  franchiseeName?: string;
  location?: string;
  territory?: string;
  openedDate?: string;
  closedDate?: string;
  initialFee?: number;
  notes?: string;
}

export interface UpdateUnitInput {
  name?: string;
  type?: UnitType;
  description?: string;
  status?: UnitStatus;
  franchiseeName?: string;
  location?: string;
  territory?: string;
  openedDate?: string;
  closedDate?: string;
  initialFee?: number;
  notes?: string;
}

export interface ListUnitsOpts {
  type?: UnitType;
  status?: UnitStatus;
}

export interface CreateAgreementInput {
  unitId: string;
  franchiseeName: string;
  type: AgreementType;
  description?: string;
  status?: AgreementStatus;
  startDate?: string;
  endDate?: string;
  territory?: string;
  initialFee?: number;
  royaltyRate?: number;
  advertisingFee?: number;
  termYears?: number;
  renewalTerms?: string;
  notes?: string;
}

export interface UpdateAgreementInput {
  unitId?: string;
  franchiseeName?: string;
  type?: AgreementType;
  description?: string;
  status?: AgreementStatus;
  startDate?: string;
  endDate?: string;
  territory?: string;
  initialFee?: number;
  royaltyRate?: number;
  advertisingFee?: number;
  termYears?: number;
  renewalTerms?: string;
  notes?: string;
}

export interface ListAgreementsOpts {
  unitId?: string;
  type?: AgreementType;
  status?: AgreementStatus;
}

export interface CreateRoyaltyInput {
  unitId: string;
  agreementId: string;
  type: RoyaltyType;
  amount: number;
  currency?: string;
  description?: string;
  status?: RoyaltyStatus;
  period?: string;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
}

export interface UpdateRoyaltyInput {
  unitId?: string;
  agreementId?: string;
  type?: RoyaltyType;
  amount?: number;
  currency?: string;
  description?: string;
  status?: RoyaltyStatus;
  period?: string;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
}

export interface ListRoyaltiesOpts {
  unitId?: string;
  agreementId?: string;
  type?: RoyaltyType;
  status?: RoyaltyStatus;
}

export interface CreateTrainingInput {
  unitId: string;
  franchiseeName: string;
  type: TrainingType;
  description?: string;
  status?: TrainingStatus;
  scheduledDate?: string;
  completedDate?: string;
  trainer?: string;
  location?: string;
  attendees?: string[];
  certifications?: string[];
  notes?: string;
}

export interface UpdateTrainingInput {
  unitId?: string;
  franchiseeName?: string;
  type?: TrainingType;
  description?: string;
  status?: TrainingStatus;
  scheduledDate?: string;
  completedDate?: string;
  trainer?: string;
  location?: string;
  attendees?: string[];
  certifications?: string[];
  notes?: string;
}

export interface ListTrainingOpts {
  unitId?: string;
  type?: TrainingType;
  status?: TrainingStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toUnit(row: MemoryRow): FranchiseUnit {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as UnitType) ?? 'single',
    description: (c.description as string) ?? '',
    status: (c.status as UnitStatus) ?? 'prospective',
    franchiseeName: (c.franchiseeName as string) ?? '',
    location: (c.location as string) ?? '',
    territory: (c.territory as string) ?? '',
    openedDate: c.openedDate ? new Date(c.openedDate as string) : null,
    closedDate: c.closedDate ? new Date(c.closedDate as string) : null,
    initialFee: (c.initialFee as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAgreement(row: MemoryRow): FranchiseAgreement {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    unitId: (c.unitId as string) ?? '',
    franchiseeName: (c.franchiseeName as string) ?? '',
    type: (c.type as AgreementType) ?? 'franchise',
    description: (c.description as string) ?? '',
    status: (c.status as AgreementStatus) ?? 'draft',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    territory: (c.territory as string) ?? '',
    initialFee: (c.initialFee as number) ?? 0,
    royaltyRate: (c.royaltyRate as number) ?? 0,
    advertisingFee: (c.advertisingFee as number) ?? 0,
    termYears: (c.termYears as number) ?? 0,
    renewalTerms: (c.renewalTerms as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRoyalty(row: MemoryRow): FranchiseRoyalty {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    unitId: (c.unitId as string) ?? '',
    agreementId: (c.agreementId as string) ?? '',
    type: (c.type as RoyaltyType) ?? 'percentage',
    amount: (c.amount as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    description: (c.description as string) ?? '',
    status: (c.status as RoyaltyStatus) ?? 'accrued',
    period: (c.period as string) ?? '',
    dueDate: c.dueDate ? new Date(c.dueDate as string) : null,
    paidDate: c.paidDate ? new Date(c.paidDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTraining(row: MemoryRow): FranchiseTraining {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    unitId: (c.unitId as string) ?? '',
    franchiseeName: (c.franchiseeName as string) ?? '',
    type: (c.type as TrainingType) ?? 'initial',
    description: (c.description as string) ?? '',
    status: (c.status as TrainingStatus) ?? 'scheduled',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    trainer: (c.trainer as string) ?? '',
    location: (c.location as string) ?? '',
    attendees: (c.attendees as string[]) ?? [],
    certifications: (c.certifications as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const FranchiseDevelopmentService = {
  // ── Units ──

  async createUnit(organizationId: string, workspaceId: string, input: CreateUnitInput, createdBy: string): Promise<FranchiseUnit> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'prospective',
      franchiseeName: input.franchiseeName ?? '',
      location: input.location ?? '',
      territory: input.territory ?? '',
      openedDate: input.openedDate ?? null,
      closedDate: input.closedDate ?? null,
      initialFee: input.initialFee ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'franchise_unit',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['franchise_unit', content.type, content.status]),
        createdBy,
      },
    });
    return toUnit(row as MemoryRow);
  },

  async getUnit(id: string): Promise<FranchiseUnit | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'franchise_unit') return null;
    return toUnit(row as MemoryRow);
  },

  async listUnits(organizationId: string, opts: ListUnitsOpts = {}): Promise<FranchiseUnit[]> {
    const where: Record<string, unknown> = { organizationId, type: 'franchise_unit' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toUnit);
  },

  async updateUnit(id: string, input: UpdateUnitInput): Promise<FranchiseUnit | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.franchiseeName !== undefined && { franchiseeName: input.franchiseeName }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.territory !== undefined && { territory: input.territory }),
      ...(input.openedDate !== undefined && { openedDate: input.openedDate }),
      ...(input.closedDate !== undefined && { closedDate: input.closedDate }),
      ...(input.initialFee !== undefined && { initialFee: input.initialFee }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['franchise_unit', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toUnit(row as MemoryRow);
  },

  async deleteUnit(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveUnit(id: string, _approvedBy: string): Promise<FranchiseUnit | null> {
    return FranchiseDevelopmentService.updateUnit(id, { status: 'approved' });
  },

  async activateUnit(id: string, _activatedBy: string): Promise<FranchiseUnit | null> {
    return FranchiseDevelopmentService.updateUnit(id, { status: 'active' });
  },

  async suspendUnit(id: string, _suspendedBy: string): Promise<FranchiseUnit | null> {
    return FranchiseDevelopmentService.updateUnit(id, { status: 'suspended' });
  },

  async terminateUnit(id: string, _terminatedBy: string): Promise<FranchiseUnit | null> {
    return FranchiseDevelopmentService.updateUnit(id, { status: 'terminated' });
  },

  // ── Agreements ──

  async createAgreement(organizationId: string, workspaceId: string, input: CreateAgreementInput, createdBy: string): Promise<FranchiseAgreement> {
    const content = {
      unitId: input.unitId,
      franchiseeName: input.franchiseeName.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      territory: input.territory ?? '',
      initialFee: input.initialFee ?? 0,
      royaltyRate: input.royaltyRate ?? 0,
      advertisingFee: input.advertisingFee ?? 0,
      termYears: input.termYears ?? 0,
      renewalTerms: input.renewalTerms ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'franchise_agreement',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.unitId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['franchise_agreement', content.type, content.status]),
        createdBy,
      },
    });
    return toAgreement(row as MemoryRow);
  },

  async getAgreement(id: string): Promise<FranchiseAgreement | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'franchise_agreement') return null;
    return toAgreement(row as MemoryRow);
  },

  async listAgreements(organizationId: string, opts: ListAgreementsOpts = {}): Promise<FranchiseAgreement[]> {
    const where: Record<string, unknown> = { organizationId, type: 'franchise_agreement' };
    const conditions: unknown[] = [];
    if (opts.unitId) conditions.push({ content: { contains: `"unitId":"${opts.unitId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAgreement);
  },

  async updateAgreement(id: string, input: UpdateAgreementInput): Promise<FranchiseAgreement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.unitId !== undefined && { unitId: input.unitId }),
      ...(input.franchiseeName !== undefined && { franchiseeName: input.franchiseeName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.territory !== undefined && { territory: input.territory }),
      ...(input.initialFee !== undefined && { initialFee: input.initialFee }),
      ...(input.royaltyRate !== undefined && { royaltyRate: input.royaltyRate }),
      ...(input.advertisingFee !== undefined && { advertisingFee: input.advertisingFee }),
      ...(input.termYears !== undefined && { termYears: input.termYears }),
      ...(input.renewalTerms !== undefined && { renewalTerms: input.renewalTerms }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['franchise_agreement', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAgreement(row as MemoryRow);
  },

  async deleteAgreement(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async executeAgreement(id: string, _executedBy: string): Promise<FranchiseAgreement | null> {
    return FranchiseDevelopmentService.updateAgreement(id, { status: 'executed' });
  },

  async activateAgreement(id: string, _activatedBy: string): Promise<FranchiseAgreement | null> {
    return FranchiseDevelopmentService.updateAgreement(id, { status: 'active' });
  },

  async expireAgreement(id: string, _expiredBy: string): Promise<FranchiseAgreement | null> {
    return FranchiseDevelopmentService.updateAgreement(id, { status: 'expired' });
  },

  async terminateAgreement(id: string, _terminatedBy: string): Promise<FranchiseAgreement | null> {
    return FranchiseDevelopmentService.updateAgreement(id, { status: 'terminated' });
  },

  async renewAgreement(id: string, _renewedBy: string): Promise<FranchiseAgreement | null> {
    return FranchiseDevelopmentService.updateAgreement(id, { status: 'renewed' });
  },

  async amendAgreement(id: string, _amendedBy: string): Promise<FranchiseAgreement | null> {
    return FranchiseDevelopmentService.updateAgreement(id, { status: 'amended' });
  },

  // ── Royalties ──

  async createRoyalty(organizationId: string, workspaceId: string, input: CreateRoyaltyInput, createdBy: string): Promise<FranchiseRoyalty> {
    const content = {
      unitId: input.unitId,
      agreementId: input.agreementId,
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      description: input.description ?? '',
      status: input.status ?? 'accrued',
      period: input.period ?? '',
      dueDate: input.dueDate ?? null,
      paidDate: input.paidDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'franchise_royalty',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.agreementId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['franchise_royalty', content.type, content.status]),
        createdBy,
      },
    });
    return toRoyalty(row as MemoryRow);
  },

  async getRoyalty(id: string): Promise<FranchiseRoyalty | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'franchise_royalty') return null;
    return toRoyalty(row as MemoryRow);
  },

  async listRoyalties(organizationId: string, opts: ListRoyaltiesOpts = {}): Promise<FranchiseRoyalty[]> {
    const where: Record<string, unknown> = { organizationId, type: 'franchise_royalty' };
    const conditions: unknown[] = [];
    if (opts.unitId) conditions.push({ content: { contains: `"unitId":"${opts.unitId}"` } });
    if (opts.agreementId) conditions.push({ content: { contains: `"agreementId":"${opts.agreementId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRoyalty);
  },

  async updateRoyalty(id: string, input: UpdateRoyaltyInput): Promise<FranchiseRoyalty | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.unitId !== undefined && { unitId: input.unitId }),
      ...(input.agreementId !== undefined && { agreementId: input.agreementId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.paidDate !== undefined && { paidDate: input.paidDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['franchise_royalty', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRoyalty(row as MemoryRow);
  },

  async deleteRoyalty(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async billRoyalty(id: string, _billedBy: string): Promise<FranchiseRoyalty | null> {
    return FranchiseDevelopmentService.updateRoyalty(id, { status: 'billed' });
  },

  async payRoyalty(id: string, _paidBy: string): Promise<FranchiseRoyalty | null> {
    return FranchiseDevelopmentService.updateRoyalty(id, { status: 'paid', paidDate: new Date().toISOString() });
  },

  async overdueRoyalty(id: string, _markedBy: string): Promise<FranchiseRoyalty | null> {
    return FranchiseDevelopmentService.updateRoyalty(id, { status: 'overdue' });
  },

  async waiveRoyalty(id: string, _waivedBy: string): Promise<FranchiseRoyalty | null> {
    return FranchiseDevelopmentService.updateRoyalty(id, { status: 'waived' });
  },

  async disputeRoyalty(id: string, _disputedBy: string): Promise<FranchiseRoyalty | null> {
    return FranchiseDevelopmentService.updateRoyalty(id, { status: 'disputed' });
  },

  // ── Training ──

  async createTraining(organizationId: string, workspaceId: string, input: CreateTrainingInput, createdBy: string): Promise<FranchiseTraining> {
    const content = {
      unitId: input.unitId,
      franchiseeName: input.franchiseeName.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      trainer: input.trainer ?? '',
      location: input.location ?? '',
      attendees: input.attendees ?? [],
      certifications: input.certifications ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'franchise_training',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.unitId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['franchise_training', content.type, content.status]),
        createdBy,
      },
    });
    return toTraining(row as MemoryRow);
  },

  async getTraining(id: string): Promise<FranchiseTraining | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'franchise_training') return null;
    return toTraining(row as MemoryRow);
  },

  async listTraining(organizationId: string, opts: ListTrainingOpts = {}): Promise<FranchiseTraining[]> {
    const where: Record<string, unknown> = { organizationId, type: 'franchise_training' };
    const conditions: unknown[] = [];
    if (opts.unitId) conditions.push({ content: { contains: `"unitId":"${opts.unitId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTraining);
  },

  async updateTraining(id: string, input: UpdateTrainingInput): Promise<FranchiseTraining | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.unitId !== undefined && { unitId: input.unitId }),
      ...(input.franchiseeName !== undefined && { franchiseeName: input.franchiseeName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.trainer !== undefined && { trainer: input.trainer }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.attendees !== undefined && { attendees: input.attendees }),
      ...(input.certifications !== undefined && { certifications: input.certifications }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['franchise_training', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toTraining(row as MemoryRow);
  },

  async deleteTraining(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startTraining(id: string, _startedBy: string): Promise<FranchiseTraining | null> {
    return FranchiseDevelopmentService.updateTraining(id, { status: 'in_progress' });
  },

  async completeTraining(id: string, _completedBy: string): Promise<FranchiseTraining | null> {
    return FranchiseDevelopmentService.updateTraining(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async overdueTraining(id: string, _markedBy: string): Promise<FranchiseTraining | null> {
    return FranchiseDevelopmentService.updateTraining(id, { status: 'overdue' });
  },

  // ── Metrics & Stats ──

  async getFranchiseDevelopmentMetrics(organizationId: string): Promise<FranchiseDevelopmentMetrics> {
    const [units, agreements, royalties, training] = await Promise.all([
      FranchiseDevelopmentService.listUnits(organizationId),
      FranchiseDevelopmentService.listAgreements(organizationId),
      FranchiseDevelopmentService.listRoyalties(organizationId),
      FranchiseDevelopmentService.listTraining(organizationId),
    ]);
    const activeUnits = units.filter((u) => u.status === 'active').length;
    const executedAgreements = agreements.filter((a) => a.status === 'executed' || a.status === 'active').length;
    const pendingRoyalties = royalties.filter((r) => r.status === 'accrued' || r.status === 'billed').length;
    const overdueRoyalties = royalties.filter((r) => r.status === 'overdue').length;
    const scheduledTraining = training.filter((t) => t.status === 'scheduled').length;
    return { activeUnits, executedAgreements, pendingRoyalties, overdueRoyalties, scheduledTraining };
  },

  async getFranchiseDevelopmentStats(organizationId: string): Promise<FranchiseDevelopmentStats> {
    const [units, agreements, royalties, training] = await Promise.all([
      FranchiseDevelopmentService.listUnits(organizationId),
      FranchiseDevelopmentService.listAgreements(organizationId),
      FranchiseDevelopmentService.listRoyalties(organizationId),
      FranchiseDevelopmentService.listTraining(organizationId),
    ]);
    const byUnitType: Record<string, number> = {};
    const byUnitStatus: Record<string, number> = {};
    const byAgreementType: Record<string, number> = {};
    const byAgreementStatus: Record<string, number> = {};
    const byRoyaltyType: Record<string, number> = {};
    const byRoyaltyStatus: Record<string, number> = {};
    const byTrainingType: Record<string, number> = {};
    const byTrainingStatus: Record<string, number> = {};
    for (const u of units) { byUnitType[u.type] = (byUnitType[u.type] ?? 0) + 1; byUnitStatus[u.status] = (byUnitStatus[u.status] ?? 0) + 1; }
    for (const a of agreements) { byAgreementType[a.type] = (byAgreementType[a.type] ?? 0) + 1; byAgreementStatus[a.status] = (byAgreementStatus[a.status] ?? 0) + 1; }
    for (const r of royalties) { byRoyaltyType[r.type] = (byRoyaltyType[r.type] ?? 0) + 1; byRoyaltyStatus[r.status] = (byRoyaltyStatus[r.status] ?? 0) + 1; }
    for (const t of training) { byTrainingType[t.type] = (byTrainingType[t.type] ?? 0) + 1; byTrainingStatus[t.status] = (byTrainingStatus[t.status] ?? 0) + 1; }
    return {
      unitCount: units.length,
      activeUnitCount: units.filter((u) => u.status === 'active').length,
      agreementCount: agreements.length,
      executedAgreementCount: agreements.filter((a) => a.status === 'executed' || a.status === 'active').length,
      royaltyCount: royalties.length,
      pendingRoyaltyCount: royalties.filter((r) => r.status === 'accrued' || r.status === 'billed').length,
      trainingCount: training.length,
      scheduledTrainingCount: training.filter((t) => t.status === 'scheduled').length,
      byUnitType, byUnitStatus, byAgreementType, byAgreementStatus, byRoyaltyType, byRoyaltyStatus, byTrainingType, byTrainingStatus,
    };
  },
};
