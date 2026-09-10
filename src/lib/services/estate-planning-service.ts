import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type TrustType = 'revocable' | 'irrevocable' | 'living' | 'testamentary' | 'charitable' | 'special_needs' | 'spendthrift' | 'bypass' | 'generation_skipping' | 'spousal';
export type TrustStatus = 'draft' | 'active' | 'amended' | 'terminated' | 'suspended' | 'pending_funding';
export type WillType = 'simple' | 'complex' | 'holographic' | 'nuncupative' | 'pour_over' | 'reciprocal' | 'living_will';
export type WillStatus = 'draft' | 'executed' | 'amended' | 'revoked' | 'probated' | 'contested';
export type BeneficiaryType = 'primary' | 'contingent' | 'remainder' | 'secondary' | 'tertiary' | 'alternate';
export type BeneficiaryStatus = 'active' | 'deceased' | 'disclaimed' | 'removed' | 'minor' | 'incapacitated';
export type ExecutorType = 'primary' | 'alternate' | 'co_executor' | 'successor' | 'professional' | 'corporate';
export type ExecutorStatus = 'appointed' | 'declined' | 'removed' | 'resigned' | 'active' | 'compensated';

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

export interface EstateTrust {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: TrustType;
  description: string;
  status: TrustStatus;
  settlor: string;
  trustee: string;
  beneficiaryIds: string[];
  assets: string;
  value: number;
  createdDate: Date | null;
  terminatedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EstateWill {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: WillType;
  description: string;
  status: WillStatus;
  testator: string;
  executorIds: string[];
  beneficiaryIds: string[];
  witnesses: string[];
  notarized: boolean;
  executedDate: Date | null;
  probateDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EstateBeneficiary {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: BeneficiaryType;
  description: string;
  status: BeneficiaryStatus;
  relationship: string;
  dateOfBirth: Date | null;
  contactInfo: string;
  sharePercentage: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EstateExecutor {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ExecutorType;
  description: string;
  status: ExecutorStatus;
  relationship: string;
  contactInfo: string;
  compensation: string;
  appointmentDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EstatePlanningMetrics {
  activeTrusts: number;
  executedWills: number;
  activeBeneficiaries: number;
  activeExecutors: number;
  totalTrustValue: number;
}

export interface EstatePlanningStats {
  trustCount: number;
  activeTrustCount: number;
  willCount: number;
  executedWillCount: number;
  beneficiaryCount: number;
  activeBeneficiaryCount: number;
  executorCount: number;
  activeExecutorCount: number;
  byTrustType: Record<string, number>;
  byTrustStatus: Record<string, number>;
  byWillType: Record<string, number>;
  byWillStatus: Record<string, number>;
  byBeneficiaryType: Record<string, number>;
  byBeneficiaryStatus: Record<string, number>;
  byExecutorType: Record<string, number>;
  byExecutorStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateTrustInput {
  name: string;
  type: TrustType;
  description?: string;
  status?: TrustStatus;
  settlor?: string;
  trustee?: string;
  beneficiaryIds?: string[];
  assets?: string;
  value?: number;
  createdDate?: string;
  terminatedDate?: string;
  notes?: string;
}

export interface UpdateTrustInput {
  name?: string;
  type?: TrustType;
  description?: string;
  status?: TrustStatus;
  settlor?: string;
  trustee?: string;
  beneficiaryIds?: string[];
  assets?: string;
  value?: number;
  createdDate?: string;
  terminatedDate?: string;
  notes?: string;
}

export interface ListTrustsOpts {
  type?: TrustType;
  status?: TrustStatus;
}

export interface CreateWillInput {
  title: string;
  type: WillType;
  description?: string;
  status?: WillStatus;
  testator?: string;
  executorIds?: string[];
  beneficiaryIds?: string[];
  witnesses?: string[];
  notarized?: boolean;
  executedDate?: string;
  probateDate?: string;
  notes?: string;
}

export interface UpdateWillInput {
  title?: string;
  type?: WillType;
  description?: string;
  status?: WillStatus;
  testator?: string;
  executorIds?: string[];
  beneficiaryIds?: string[];
  witnesses?: string[];
  notarized?: boolean;
  executedDate?: string;
  probateDate?: string;
  notes?: string;
}

export interface ListWillsOpts {
  type?: WillType;
  status?: WillStatus;
}

export interface CreateBeneficiaryInput {
  name: string;
  type: BeneficiaryType;
  description?: string;
  status?: BeneficiaryStatus;
  relationship?: string;
  dateOfBirth?: string;
  contactInfo?: string;
  sharePercentage?: number;
  notes?: string;
}

export interface UpdateBeneficiaryInput {
  name?: string;
  type?: BeneficiaryType;
  description?: string;
  status?: BeneficiaryStatus;
  relationship?: string;
  dateOfBirth?: string;
  contactInfo?: string;
  sharePercentage?: number;
  notes?: string;
}

export interface ListBeneficiariesOpts {
  type?: BeneficiaryType;
  status?: BeneficiaryStatus;
}

export interface CreateExecutorInput {
  name: string;
  type: ExecutorType;
  description?: string;
  status?: ExecutorStatus;
  relationship?: string;
  contactInfo?: string;
  compensation?: string;
  appointmentDate?: string;
  notes?: string;
}

export interface UpdateExecutorInput {
  name?: string;
  type?: ExecutorType;
  description?: string;
  status?: ExecutorStatus;
  relationship?: string;
  contactInfo?: string;
  compensation?: string;
  appointmentDate?: string;
  notes?: string;
}

export interface ListExecutorsOpts {
  type?: ExecutorType;
  status?: ExecutorStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toTrust(row: MemoryRow): EstateTrust {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as TrustType) ?? 'revocable',
    description: (c.description as string) ?? '',
    status: (c.status as TrustStatus) ?? 'draft',
    settlor: (c.settlor as string) ?? '',
    trustee: (c.trustee as string) ?? '',
    beneficiaryIds: (c.beneficiaryIds as string[]) ?? [],
    assets: (c.assets as string) ?? '',
    value: (c.value as number) ?? 0,
    createdDate: c.createdDate ? new Date(c.createdDate as string) : null,
    terminatedDate: c.terminatedDate ? new Date(c.terminatedDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toWill(row: MemoryRow): EstateWill {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as WillType) ?? 'simple',
    description: (c.description as string) ?? '',
    status: (c.status as WillStatus) ?? 'draft',
    testator: (c.testator as string) ?? '',
    executorIds: (c.executorIds as string[]) ?? [],
    beneficiaryIds: (c.beneficiaryIds as string[]) ?? [],
    witnesses: (c.witnesses as string[]) ?? [],
    notarized: (c.notarized as boolean) ?? false,
    executedDate: c.executedDate ? new Date(c.executedDate as string) : null,
    probateDate: c.probateDate ? new Date(c.probateDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toBeneficiary(row: MemoryRow): EstateBeneficiary {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as BeneficiaryType) ?? 'primary',
    description: (c.description as string) ?? '',
    status: (c.status as BeneficiaryStatus) ?? 'active',
    relationship: (c.relationship as string) ?? '',
    dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth as string) : null,
    contactInfo: (c.contactInfo as string) ?? '',
    sharePercentage: (c.sharePercentage as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toExecutor(row: MemoryRow): EstateExecutor {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ExecutorType) ?? 'primary',
    description: (c.description as string) ?? '',
    status: (c.status as ExecutorStatus) ?? 'appointed',
    relationship: (c.relationship as string) ?? '',
    contactInfo: (c.contactInfo as string) ?? '',
    compensation: (c.compensation as string) ?? '',
    appointmentDate: c.appointmentDate ? new Date(c.appointmentDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const EstatePlanningService = {
  // ── Trusts ──

  async createTrust(organizationId: string, workspaceId: string, input: CreateTrustInput, createdBy: string): Promise<EstateTrust> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      settlor: input.settlor ?? '',
      trustee: input.trustee ?? '',
      beneficiaryIds: input.beneficiaryIds ?? [],
      assets: input.assets ?? '',
      value: input.value ?? 0,
      createdDate: input.createdDate ?? null,
      terminatedDate: input.terminatedDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'estate_trust',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['estate_trust', content.type, content.status]),
        createdBy,
      },
    });
    return toTrust(row as MemoryRow);
  },

  async getTrust(id: string): Promise<EstateTrust | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'estate_trust') return null;
    return toTrust(row as MemoryRow);
  },

  async listTrusts(organizationId: string, opts: ListTrustsOpts = {}): Promise<EstateTrust[]> {
    const where: Record<string, unknown> = { organizationId, type: 'estate_trust' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTrust);
  },

  async updateTrust(id: string, input: UpdateTrustInput): Promise<EstateTrust | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.settlor !== undefined && { settlor: input.settlor }),
      ...(input.trustee !== undefined && { trustee: input.trustee }),
      ...(input.beneficiaryIds !== undefined && { beneficiaryIds: input.beneficiaryIds }),
      ...(input.assets !== undefined && { assets: input.assets }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.createdDate !== undefined && { createdDate: input.createdDate }),
      ...(input.terminatedDate !== undefined && { terminatedDate: input.terminatedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['estate_trust', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toTrust(row as MemoryRow);
  },

  async deleteTrust(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateTrust(id: string, _activatedBy: string): Promise<EstateTrust | null> {
    return EstatePlanningService.updateTrust(id, { status: 'active' });
  },

  async amendTrust(id: string, _amendedBy: string): Promise<EstateTrust | null> {
    return EstatePlanningService.updateTrust(id, { status: 'amended' });
  },

  async suspendTrust(id: string, _suspendedBy: string): Promise<EstateTrust | null> {
    return EstatePlanningService.updateTrust(id, { status: 'suspended' });
  },

  async terminateTrust(id: string, _terminatedBy: string): Promise<EstateTrust | null> {
    return EstatePlanningService.updateTrust(id, { status: 'terminated', terminatedDate: new Date().toISOString() });
  },

  async fundTrust(id: string, _fundedBy: string): Promise<EstateTrust | null> {
    return EstatePlanningService.updateTrust(id, { status: 'active' });
  },

  // ── Wills ──

  async createWill(organizationId: string, workspaceId: string, input: CreateWillInput, createdBy: string): Promise<EstateWill> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      testator: input.testator ?? '',
      executorIds: input.executorIds ?? [],
      beneficiaryIds: input.beneficiaryIds ?? [],
      witnesses: input.witnesses ?? [],
      notarized: input.notarized ?? false,
      executedDate: input.executedDate ?? null,
      probateDate: input.probateDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'estate_will',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['estate_will', content.type, content.status]),
        createdBy,
      },
    });
    return toWill(row as MemoryRow);
  },

  async getWill(id: string): Promise<EstateWill | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'estate_will') return null;
    return toWill(row as MemoryRow);
  },

  async listWills(organizationId: string, opts: ListWillsOpts = {}): Promise<EstateWill[]> {
    const where: Record<string, unknown> = { organizationId, type: 'estate_will' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toWill);
  },

  async updateWill(id: string, input: UpdateWillInput): Promise<EstateWill | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.testator !== undefined && { testator: input.testator }),
      ...(input.executorIds !== undefined && { executorIds: input.executorIds }),
      ...(input.beneficiaryIds !== undefined && { beneficiaryIds: input.beneficiaryIds }),
      ...(input.witnesses !== undefined && { witnesses: input.witnesses }),
      ...(input.notarized !== undefined && { notarized: input.notarized }),
      ...(input.executedDate !== undefined && { executedDate: input.executedDate }),
      ...(input.probateDate !== undefined && { probateDate: input.probateDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['estate_will', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toWill(row as MemoryRow);
  },

  async deleteWill(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async executeWill(id: string, _executedBy: string): Promise<EstateWill | null> {
    return EstatePlanningService.updateWill(id, { status: 'executed', executedDate: new Date().toISOString() });
  },

  async amendWill(id: string, _amendedBy: string): Promise<EstateWill | null> {
    return EstatePlanningService.updateWill(id, { status: 'amended' });
  },

  async revokeWill(id: string, _revokedBy: string): Promise<EstateWill | null> {
    return EstatePlanningService.updateWill(id, { status: 'revoked' });
  },

  async probateWill(id: string, _probatedBy: string): Promise<EstateWill | null> {
    return EstatePlanningService.updateWill(id, { status: 'probated', probateDate: new Date().toISOString() });
  },

  async contestWill(id: string, _contestedBy: string): Promise<EstateWill | null> {
    return EstatePlanningService.updateWill(id, { status: 'contested' });
  },

  // ── Beneficiaries ──

  async createBeneficiary(organizationId: string, workspaceId: string, input: CreateBeneficiaryInput, createdBy: string): Promise<EstateBeneficiary> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      relationship: input.relationship ?? '',
      dateOfBirth: input.dateOfBirth ?? null,
      contactInfo: input.contactInfo ?? '',
      sharePercentage: input.sharePercentage ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'estate_beneficiary',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['estate_beneficiary', content.type, content.status]),
        createdBy,
      },
    });
    return toBeneficiary(row as MemoryRow);
  },

  async getBeneficiary(id: string): Promise<EstateBeneficiary | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'estate_beneficiary') return null;
    return toBeneficiary(row as MemoryRow);
  },

  async listBeneficiaries(organizationId: string, opts: ListBeneficiariesOpts = {}): Promise<EstateBeneficiary[]> {
    const where: Record<string, unknown> = { organizationId, type: 'estate_beneficiary' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toBeneficiary);
  },

  async updateBeneficiary(id: string, input: UpdateBeneficiaryInput): Promise<EstateBeneficiary | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.relationship !== undefined && { relationship: input.relationship }),
      ...(input.dateOfBirth !== undefined && { dateOfBirth: input.dateOfBirth }),
      ...(input.contactInfo !== undefined && { contactInfo: input.contactInfo }),
      ...(input.sharePercentage !== undefined && { sharePercentage: input.sharePercentage }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['estate_beneficiary', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toBeneficiary(row as MemoryRow);
  },

  async deleteBeneficiary(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async removeBeneficiary(id: string, _removedBy: string): Promise<EstateBeneficiary | null> {
    return EstatePlanningService.updateBeneficiary(id, { status: 'removed' });
  },

  async disclaimBeneficiary(id: string, _disclaimedBy: string): Promise<EstateBeneficiary | null> {
    return EstatePlanningService.updateBeneficiary(id, { status: 'disclaimed' });
  },

  // ── Executors ──

  async createExecutor(organizationId: string, workspaceId: string, input: CreateExecutorInput, createdBy: string): Promise<EstateExecutor> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'appointed',
      relationship: input.relationship ?? '',
      contactInfo: input.contactInfo ?? '',
      compensation: input.compensation ?? '',
      appointmentDate: input.appointmentDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'estate_executor',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['estate_executor', content.type, content.status]),
        createdBy,
      },
    });
    return toExecutor(row as MemoryRow);
  },

  async getExecutor(id: string): Promise<EstateExecutor | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'estate_executor') return null;
    return toExecutor(row as MemoryRow);
  },

  async listExecutors(organizationId: string, opts: ListExecutorsOpts = {}): Promise<EstateExecutor[]> {
    const where: Record<string, unknown> = { organizationId, type: 'estate_executor' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toExecutor);
  },

  async updateExecutor(id: string, input: UpdateExecutorInput): Promise<EstateExecutor | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.relationship !== undefined && { relationship: input.relationship }),
      ...(input.contactInfo !== undefined && { contactInfo: input.contactInfo }),
      ...(input.compensation !== undefined && { compensation: input.compensation }),
      ...(input.appointmentDate !== undefined && { appointmentDate: input.appointmentDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['estate_executor', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toExecutor(row as MemoryRow);
  },

  async deleteExecutor(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateExecutor(id: string, _activatedBy: string): Promise<EstateExecutor | null> {
    return EstatePlanningService.updateExecutor(id, { status: 'active' });
  },

  async declineExecutor(id: string, _declinedBy: string): Promise<EstateExecutor | null> {
    return EstatePlanningService.updateExecutor(id, { status: 'declined' });
  },

  async removeExecutor(id: string, _removedBy: string): Promise<EstateExecutor | null> {
    return EstatePlanningService.updateExecutor(id, { status: 'removed' });
  },

  async resignExecutor(id: string, _resignedBy: string): Promise<EstateExecutor | null> {
    return EstatePlanningService.updateExecutor(id, { status: 'resigned' });
  },

  // ── Metrics & Stats ──

  async getEstatePlanningMetrics(organizationId: string): Promise<EstatePlanningMetrics> {
    const [trusts, wills, beneficiaries, executors] = await Promise.all([
      EstatePlanningService.listTrusts(organizationId),
      EstatePlanningService.listWills(organizationId),
      EstatePlanningService.listBeneficiaries(organizationId),
      EstatePlanningService.listExecutors(organizationId),
    ]);
    const activeTrusts = trusts.filter((t) => t.status === 'active').length;
    const executedWills = wills.filter((w) => w.status === 'executed').length;
    const activeBeneficiaries = beneficiaries.filter((b) => b.status === 'active').length;
    const activeExecutors = executors.filter((e) => e.status === 'active').length;
    const totalTrustValue = trusts.reduce((sum, t) => sum + t.value, 0);
    return { activeTrusts, executedWills, activeBeneficiaries, activeExecutors, totalTrustValue };
  },

  async getEstatePlanningStats(organizationId: string): Promise<EstatePlanningStats> {
    const [trusts, wills, beneficiaries, executors] = await Promise.all([
      EstatePlanningService.listTrusts(organizationId),
      EstatePlanningService.listWills(organizationId),
      EstatePlanningService.listBeneficiaries(organizationId),
      EstatePlanningService.listExecutors(organizationId),
    ]);
    const byTrustType: Record<string, number> = {};
    const byTrustStatus: Record<string, number> = {};
    const byWillType: Record<string, number> = {};
    const byWillStatus: Record<string, number> = {};
    const byBeneficiaryType: Record<string, number> = {};
    const byBeneficiaryStatus: Record<string, number> = {};
    const byExecutorType: Record<string, number> = {};
    const byExecutorStatus: Record<string, number> = {};
    for (const t of trusts) { byTrustType[t.type] = (byTrustType[t.type] ?? 0) + 1; byTrustStatus[t.status] = (byTrustStatus[t.status] ?? 0) + 1; }
    for (const w of wills) { byWillType[w.type] = (byWillType[w.type] ?? 0) + 1; byWillStatus[w.status] = (byWillStatus[w.status] ?? 0) + 1; }
    for (const b of beneficiaries) { byBeneficiaryType[b.type] = (byBeneficiaryType[b.type] ?? 0) + 1; byBeneficiaryStatus[b.status] = (byBeneficiaryStatus[b.status] ?? 0) + 1; }
    for (const e of executors) { byExecutorType[e.type] = (byExecutorType[e.type] ?? 0) + 1; byExecutorStatus[e.status] = (byExecutorStatus[e.status] ?? 0) + 1; }
    return {
      trustCount: trusts.length,
      activeTrustCount: trusts.filter((t) => t.status === 'active').length,
      willCount: wills.length,
      executedWillCount: wills.filter((w) => w.status === 'executed').length,
      beneficiaryCount: beneficiaries.length,
      activeBeneficiaryCount: beneficiaries.filter((b) => b.status === 'active').length,
      executorCount: executors.length,
      activeExecutorCount: executors.filter((e) => e.status === 'active').length,
      byTrustType, byTrustStatus, byWillType, byWillStatus, byBeneficiaryType, byBeneficiaryStatus, byExecutorType, byExecutorStatus,
    };
  },
};
