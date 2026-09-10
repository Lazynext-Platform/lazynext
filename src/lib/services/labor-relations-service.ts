import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type UnionType = 'local' | 'national' | 'international' | 'company' | 'industry' | 'craft';
export type UnionStatus = 'active' | 'inactive' | 'decertified' | 'pending_certification';
export type GrievanceType = 'contract_violation' | 'discrimination' | 'harassment' | 'safety' | 'wage' | 'hours' | 'benefits' | 'working_conditions' | 'termination' | 'discipline' | 'other';
export type GrievanceStatus = 'filed' | 'under_review' | 'investigated' | 'mediated' | 'arbitrated' | 'resolved' | 'withdrawn' | 'dismissed';
export type GrievancePriority = 'low' | 'medium' | 'high' | 'critical';
export type ContractType = 'cba' | 'memorandum' | 'side_letter' | 'agreement' | 'addendum';
export type ContractStatus = 'draft' | 'negotiating' | 'ratified' | 'active' | 'expired' | 'terminated' | 'renegotiating';
export type DisputeType = 'contract_interpretation' | 'unfair_labor_practice' | 'jurisdictional' | 'recognition' | 'bargaining' | 'work_stoppage' | 'lockout' | 'other';
export type DisputeStatus = 'open' | 'mediation' | 'arbitration' | 'resolved' | 'escalated' | 'closed' | 'withdrawn';
export type DisputePriority = 'low' | 'medium' | 'high' | 'critical';

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

export interface LaborUnion {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: UnionType;
  description: string;
  status: UnionStatus;
  localNumber: string;
  affiliate: string;
  contactName: string;
  email: string;
  phone: string;
  memberCount: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LaborGrievance {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: GrievanceType;
  description: string;
  status: GrievanceStatus;
  priority: GrievancePriority;
  filedBy: string;
  filedDate: Date | null;
  unionId: string | null;
  assignedTo: string;
  department: string;
  summary: string;
  resolution: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LaborContract {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: ContractType;
  unionId: string | null;
  description: string;
  status: ContractStatus;
  startDate: Date | null;
  endDate: Date | null;
  effectiveDate: Date | null;
  terms: string;
  wageSchedule: string;
  benefits: string;
  workingConditions: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LaborDispute {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: DisputeType;
  description: string;
  status: DisputeStatus;
  priority: DisputePriority;
  unionId: string | null;
  contractId: string | null;
  filedBy: string;
  filedDate: Date | null;
  assignedTo: string;
  summary: string;
  resolution: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LaborRelationsMetrics {
  activeUnions: number;
  openGrievances: number;
  criticalGrievances: number;
  activeContracts: number;
  openDisputes: number;
}

export interface LaborRelationsStats {
  unionCount: number;
  grievanceCount: number;
  contractCount: number;
  disputeCount: number;
  byUnionType: Record<string, number>;
  byUnionStatus: Record<string, number>;
  byGrievanceType: Record<string, number>;
  byGrievanceStatus: Record<string, number>;
  byGrievancePriority: Record<string, number>;
  byContractType: Record<string, number>;
  byContractStatus: Record<string, number>;
  byDisputeType: Record<string, number>;
  byDisputeStatus: Record<string, number>;
  byDisputePriority: Record<string, number>;
}

// ── Input / Options ──

export interface CreateUnionInput {
  name: string;
  type: UnionType;
  description?: string;
  status?: UnionStatus;
  localNumber?: string;
  affiliate?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  memberCount?: number;
  notes?: string;
}

export interface UpdateUnionInput {
  name?: string;
  type?: UnionType;
  description?: string;
  status?: UnionStatus;
  localNumber?: string;
  affiliate?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  memberCount?: number;
  notes?: string;
}

export interface ListUnionsOpts {
  type?: UnionType;
  status?: UnionStatus;
}

export interface CreateGrievanceInput {
  title: string;
  type: GrievanceType;
  description?: string;
  status?: GrievanceStatus;
  priority?: GrievancePriority;
  filedBy?: string;
  filedDate?: string;
  unionId?: string;
  assignedTo?: string;
  department?: string;
  summary?: string;
  resolution?: string;
  notes?: string;
}

export interface UpdateGrievanceInput {
  title?: string;
  type?: GrievanceType;
  description?: string;
  status?: GrievanceStatus;
  priority?: GrievancePriority;
  filedBy?: string;
  filedDate?: string;
  unionId?: string;
  assignedTo?: string;
  department?: string;
  summary?: string;
  resolution?: string;
  notes?: string;
}

export interface ListGrievancesOpts {
  type?: GrievanceType;
  status?: GrievanceStatus;
  priority?: GrievancePriority;
}

export interface CreateContractInput {
  title: string;
  type: ContractType;
  unionId?: string;
  description?: string;
  status?: ContractStatus;
  startDate?: string;
  endDate?: string;
  effectiveDate?: string;
  terms?: string;
  wageSchedule?: string;
  benefits?: string;
  workingConditions?: string;
  notes?: string;
}

export interface UpdateContractInput {
  title?: string;
  type?: ContractType;
  unionId?: string;
  description?: string;
  status?: ContractStatus;
  startDate?: string;
  endDate?: string;
  effectiveDate?: string;
  terms?: string;
  wageSchedule?: string;
  benefits?: string;
  workingConditions?: string;
  notes?: string;
}

export interface ListContractsOpts {
  unionId?: string;
  type?: ContractType;
  status?: ContractStatus;
}

export interface CreateDisputeInput {
  title: string;
  type: DisputeType;
  description?: string;
  status?: DisputeStatus;
  priority?: DisputePriority;
  unionId?: string;
  contractId?: string;
  filedBy?: string;
  filedDate?: string;
  assignedTo?: string;
  summary?: string;
  resolution?: string;
  notes?: string;
}

export interface UpdateDisputeInput {
  title?: string;
  type?: DisputeType;
  description?: string;
  status?: DisputeStatus;
  priority?: DisputePriority;
  unionId?: string;
  contractId?: string;
  filedBy?: string;
  filedDate?: string;
  assignedTo?: string;
  summary?: string;
  resolution?: string;
  notes?: string;
}

export interface ListDisputesOpts {
  type?: DisputeType;
  status?: DisputeStatus;
  priority?: DisputePriority;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toUnion(row: MemoryRow): LaborUnion {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as UnionType) ?? 'local',
    description: (c.description as string) ?? '',
    status: (c.status as UnionStatus) ?? 'active',
    localNumber: (c.localNumber as string) ?? '',
    affiliate: (c.affiliate as string) ?? '',
    contactName: (c.contactName as string) ?? '',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    memberCount: (c.memberCount as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toGrievance(row: MemoryRow): LaborGrievance {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as GrievanceType) ?? 'other',
    description: (c.description as string) ?? '',
    status: (c.status as GrievanceStatus) ?? 'filed',
    priority: (c.priority as GrievancePriority) ?? 'medium',
    filedBy: (c.filedBy as string) ?? '',
    filedDate: c.filedDate ? new Date(c.filedDate as string) : null,
    unionId: (c.unionId as string) ?? null,
    assignedTo: (c.assignedTo as string) ?? '',
    department: (c.department as string) ?? '',
    summary: (c.summary as string) ?? '',
    resolution: (c.resolution as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toContract(row: MemoryRow): LaborContract {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as ContractType) ?? 'cba',
    unionId: (c.unionId as string) ?? null,
    description: (c.description as string) ?? '',
    status: (c.status as ContractStatus) ?? 'draft',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    effectiveDate: c.effectiveDate ? new Date(c.effectiveDate as string) : null,
    terms: (c.terms as string) ?? '',
    wageSchedule: (c.wageSchedule as string) ?? '',
    benefits: (c.benefits as string) ?? '',
    workingConditions: (c.workingConditions as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDispute(row: MemoryRow): LaborDispute {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as DisputeType) ?? 'other',
    description: (c.description as string) ?? '',
    status: (c.status as DisputeStatus) ?? 'open',
    priority: (c.priority as DisputePriority) ?? 'medium',
    unionId: (c.unionId as string) ?? null,
    contractId: (c.contractId as string) ?? null,
    filedBy: (c.filedBy as string) ?? '',
    filedDate: c.filedDate ? new Date(c.filedDate as string) : null,
    assignedTo: (c.assignedTo as string) ?? '',
    summary: (c.summary as string) ?? '',
    resolution: (c.resolution as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const LaborRelationsService = {
  // ── Unions ──

  async createUnion(organizationId: string, workspaceId: string, input: CreateUnionInput, createdBy: string): Promise<LaborUnion> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      localNumber: input.localNumber ?? '',
      affiliate: input.affiliate ?? '',
      contactName: input.contactName ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      memberCount: input.memberCount ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'labor_union',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['labor_union', content.type, content.status]),
        createdBy,
      },
    });
    return toUnion(row as MemoryRow);
  },

  async getUnion(id: string): Promise<LaborUnion | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'labor_union') return null;
    return toUnion(row as MemoryRow);
  },

  async listUnions(organizationId: string, opts: ListUnionsOpts = {}): Promise<LaborUnion[]> {
    const where: Record<string, unknown> = { organizationId, type: 'labor_union' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toUnion);
  },

  async updateUnion(id: string, input: UpdateUnionInput): Promise<LaborUnion | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.localNumber !== undefined && { localNumber: input.localNumber }),
      ...(input.affiliate !== undefined && { affiliate: input.affiliate }),
      ...(input.contactName !== undefined && { contactName: input.contactName }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.memberCount !== undefined && { memberCount: input.memberCount }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['labor_union', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toUnion(row as MemoryRow);
  },

  async deleteUnion(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async decertifyUnion(id: string, _decertifiedBy: string): Promise<LaborUnion | null> {
    return LaborRelationsService.updateUnion(id, { status: 'decertified' });
  },

  // ── Grievances ──

  async createGrievance(organizationId: string, workspaceId: string, input: CreateGrievanceInput, createdBy: string): Promise<LaborGrievance> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'filed',
      priority: input.priority ?? 'medium',
      filedBy: input.filedBy ?? '',
      filedDate: input.filedDate ?? null,
      unionId: input.unionId ?? null,
      assignedTo: input.assignedTo ?? '',
      department: input.department ?? '',
      summary: input.summary ?? '',
      resolution: input.resolution ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'labor_grievance',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.unionId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['labor_grievance', content.type, content.status, content.priority]),
        createdBy,
      },
    });
    return toGrievance(row as MemoryRow);
  },

  async getGrievance(id: string): Promise<LaborGrievance | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'labor_grievance') return null;
    return toGrievance(row as MemoryRow);
  },

  async listGrievances(organizationId: string, opts: ListGrievancesOpts = {}): Promise<LaborGrievance[]> {
    const where: Record<string, unknown> = { organizationId, type: 'labor_grievance' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.priority) conditions.push({ content: { contains: `"priority":"${opts.priority}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toGrievance);
  },

  async updateGrievance(id: string, input: UpdateGrievanceInput): Promise<LaborGrievance | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.filedBy !== undefined && { filedBy: input.filedBy }),
      ...(input.filedDate !== undefined && { filedDate: input.filedDate }),
      ...(input.unionId !== undefined && { unionId: input.unionId }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.resolution !== undefined && { resolution: input.resolution }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['labor_grievance', content.type, content.status, content.priority]) },
    }), null);
    if (!row) return null;
    return toGrievance(row as MemoryRow);
  },

  async deleteGrievance(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async reviewGrievance(id: string, _reviewedBy: string): Promise<LaborGrievance | null> {
    return LaborRelationsService.updateGrievance(id, { status: 'under_review' });
  },

  async investigateGrievance(id: string, _investigatedBy: string): Promise<LaborGrievance | null> {
    return LaborRelationsService.updateGrievance(id, { status: 'investigated' });
  },

  async mediateGrievance(id: string, _mediatedBy: string): Promise<LaborGrievance | null> {
    return LaborRelationsService.updateGrievance(id, { status: 'mediated' });
  },

  async arbitrateGrievance(id: string, _arbitratedBy: string): Promise<LaborGrievance | null> {
    return LaborRelationsService.updateGrievance(id, { status: 'arbitrated' });
  },

  async resolveGrievance(id: string, _resolvedBy: string): Promise<LaborGrievance | null> {
    return LaborRelationsService.updateGrievance(id, { status: 'resolved' });
  },

  async withdrawGrievance(id: string, _withdrawnBy: string): Promise<LaborGrievance | null> {
    return LaborRelationsService.updateGrievance(id, { status: 'withdrawn' });
  },

  async dismissGrievance(id: string, _dismissedBy: string): Promise<LaborGrievance | null> {
    return LaborRelationsService.updateGrievance(id, { status: 'dismissed' });
  },

  // ── Contracts ──

  async createContract(organizationId: string, workspaceId: string, input: CreateContractInput, createdBy: string): Promise<LaborContract> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      unionId: input.unionId ?? null,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      effectiveDate: input.effectiveDate ?? null,
      terms: input.terms ?? '',
      wageSchedule: input.wageSchedule ?? '',
      benefits: input.benefits ?? '',
      workingConditions: input.workingConditions ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'labor_contract',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.unionId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['labor_contract', content.type, content.status]),
        createdBy,
      },
    });
    return toContract(row as MemoryRow);
  },

  async getContract(id: string): Promise<LaborContract | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'labor_contract') return null;
    return toContract(row as MemoryRow);
  },

  async listContracts(organizationId: string, opts: ListContractsOpts = {}): Promise<LaborContract[]> {
    const where: Record<string, unknown> = { organizationId, type: 'labor_contract' };
    const conditions: unknown[] = [];
    if (opts.unionId) conditions.push({ content: { contains: `"unionId":"${opts.unionId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toContract);
  },

  async updateContract(id: string, input: UpdateContractInput): Promise<LaborContract | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.unionId !== undefined && { unionId: input.unionId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate }),
      ...(input.terms !== undefined && { terms: input.terms }),
      ...(input.wageSchedule !== undefined && { wageSchedule: input.wageSchedule }),
      ...(input.benefits !== undefined && { benefits: input.benefits }),
      ...(input.workingConditions !== undefined && { workingConditions: input.workingConditions }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['labor_contract', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toContract(row as MemoryRow);
  },

  async deleteContract(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async negotiateContract(id: string, _negotiatedBy: string): Promise<LaborContract | null> {
    return LaborRelationsService.updateContract(id, { status: 'negotiating' });
  },

  async ratifyContract(id: string, _ratifiedBy: string): Promise<LaborContract | null> {
    return LaborRelationsService.updateContract(id, { status: 'ratified' });
  },

  async activateContract(id: string, _activatedBy: string): Promise<LaborContract | null> {
    return LaborRelationsService.updateContract(id, { status: 'active' });
  },

  async expireContract(id: string, _expiredBy: string): Promise<LaborContract | null> {
    return LaborRelationsService.updateContract(id, { status: 'expired' });
  },

  async renegotiateContract(id: string, _renegotiatedBy: string): Promise<LaborContract | null> {
    return LaborRelationsService.updateContract(id, { status: 'renegotiating' });
  },

  // ── Disputes ──

  async createDispute(organizationId: string, workspaceId: string, input: CreateDisputeInput, createdBy: string): Promise<LaborDispute> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'open',
      priority: input.priority ?? 'medium',
      unionId: input.unionId ?? null,
      contractId: input.contractId ?? null,
      filedBy: input.filedBy ?? '',
      filedDate: input.filedDate ?? null,
      assignedTo: input.assignedTo ?? '',
      summary: input.summary ?? '',
      resolution: input.resolution ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'labor_dispute',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.contractId ?? input.unionId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['labor_dispute', content.type, content.status, content.priority]),
        createdBy,
      },
    });
    return toDispute(row as MemoryRow);
  },

  async getDispute(id: string): Promise<LaborDispute | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'labor_dispute') return null;
    return toDispute(row as MemoryRow);
  },

  async listDisputes(organizationId: string, opts: ListDisputesOpts = {}): Promise<LaborDispute[]> {
    const where: Record<string, unknown> = { organizationId, type: 'labor_dispute' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.priority) conditions.push({ content: { contains: `"priority":"${opts.priority}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toDispute);
  },

  async updateDispute(id: string, input: UpdateDisputeInput): Promise<LaborDispute | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.unionId !== undefined && { unionId: input.unionId }),
      ...(input.contractId !== undefined && { contractId: input.contractId }),
      ...(input.filedBy !== undefined && { filedBy: input.filedBy }),
      ...(input.filedDate !== undefined && { filedDate: input.filedDate }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.resolution !== undefined && { resolution: input.resolution }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['labor_dispute', content.type, content.status, content.priority]) },
    }), null);
    if (!row) return null;
    return toDispute(row as MemoryRow);
  },

  async deleteDispute(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async mediateDispute(id: string, _mediatedBy: string): Promise<LaborDispute | null> {
    return LaborRelationsService.updateDispute(id, { status: 'mediation' });
  },

  async arbitrateDispute(id: string, _arbitratedBy: string): Promise<LaborDispute | null> {
    return LaborRelationsService.updateDispute(id, { status: 'arbitration' });
  },

  async resolveDispute(id: string, _resolvedBy: string): Promise<LaborDispute | null> {
    return LaborRelationsService.updateDispute(id, { status: 'resolved' });
  },

  async escalateDispute(id: string, _escalatedBy: string): Promise<LaborDispute | null> {
    return LaborRelationsService.updateDispute(id, { status: 'escalated' });
  },

  async closeDispute(id: string, _closedBy: string): Promise<LaborDispute | null> {
    return LaborRelationsService.updateDispute(id, { status: 'closed' });
  },

  async withdrawDispute(id: string, _withdrawnBy: string): Promise<LaborDispute | null> {
    return LaborRelationsService.updateDispute(id, { status: 'withdrawn' });
  },

  // ── Metrics & Stats ──

  async getLaborRelationsMetrics(organizationId: string): Promise<LaborRelationsMetrics> {
    const [unions, grievances, contracts, disputes] = await Promise.all([
      LaborRelationsService.listUnions(organizationId),
      LaborRelationsService.listGrievances(organizationId),
      LaborRelationsService.listContracts(organizationId),
      LaborRelationsService.listDisputes(organizationId),
    ]);
    const activeUnions = unions.filter((u) => u.status === 'active').length;
    const openGrievances = grievances.filter((g) => g.status !== 'resolved' && g.status !== 'withdrawn' && g.status !== 'dismissed').length;
    const criticalGrievances = grievances.filter((g) => g.priority === 'critical' && g.status !== 'resolved' && g.status !== 'withdrawn' && g.status !== 'dismissed').length;
    const activeContracts = contracts.filter((c) => c.status === 'active').length;
    const openDisputes = disputes.filter((d) => d.status !== 'resolved' && d.status !== 'closed' && d.status !== 'withdrawn').length;
    return { activeUnions, openGrievances, criticalGrievances, activeContracts, openDisputes };
  },

  async getLaborRelationsStats(organizationId: string): Promise<LaborRelationsStats> {
    const [unions, grievances, contracts, disputes] = await Promise.all([
      LaborRelationsService.listUnions(organizationId),
      LaborRelationsService.listGrievances(organizationId),
      LaborRelationsService.listContracts(organizationId),
      LaborRelationsService.listDisputes(organizationId),
    ]);
    const byUnionType: Record<string, number> = {};
    const byUnionStatus: Record<string, number> = {};
    const byGrievanceType: Record<string, number> = {};
    const byGrievanceStatus: Record<string, number> = {};
    const byGrievancePriority: Record<string, number> = {};
    const byContractType: Record<string, number> = {};
    const byContractStatus: Record<string, number> = {};
    const byDisputeType: Record<string, number> = {};
    const byDisputeStatus: Record<string, number> = {};
    const byDisputePriority: Record<string, number> = {};
    for (const u of unions) { byUnionType[u.type] = (byUnionType[u.type] ?? 0) + 1; byUnionStatus[u.status] = (byUnionStatus[u.status] ?? 0) + 1; }
    for (const g of grievances) { byGrievanceType[g.type] = (byGrievanceType[g.type] ?? 0) + 1; byGrievanceStatus[g.status] = (byGrievanceStatus[g.status] ?? 0) + 1; byGrievancePriority[g.priority] = (byGrievancePriority[g.priority] ?? 0) + 1; }
    for (const c of contracts) { byContractType[c.type] = (byContractType[c.type] ?? 0) + 1; byContractStatus[c.status] = (byContractStatus[c.status] ?? 0) + 1; }
    for (const d of disputes) { byDisputeType[d.type] = (byDisputeType[d.type] ?? 0) + 1; byDisputeStatus[d.status] = (byDisputeStatus[d.status] ?? 0) + 1; byDisputePriority[d.priority] = (byDisputePriority[d.priority] ?? 0) + 1; }
    return {
      unionCount: unions.length,
      grievanceCount: grievances.length,
      contractCount: contracts.length,
      disputeCount: disputes.length,
      byUnionType, byUnionStatus, byGrievanceType, byGrievanceStatus, byGrievancePriority,
      byContractType, byContractStatus, byDisputeType, byDisputeStatus, byDisputePriority,
    };
  },
};
