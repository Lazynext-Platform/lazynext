import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type FranchiseeStatus = 'prospect' | 'active' | 'inactive' | 'terminated' | 'suspended';
export type FranchiseType = 'single_unit' | 'multi_unit' | 'master' | 'area_development';
export type FinancialStatus = 'good_standing' | 'delinquent' | 'bankruptcy' | 'under_review';
export type AgreementType = 'single_unit' | 'multi_unit' | 'master' | 'area_development';
export type AgreementStatus = 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'renewed';
export type TerritoryStatus = 'available' | 'assigned' | 'reserved' | 'retired';
export type RoyaltyStatus = 'pending' | 'paid' | 'overdue' | 'partial' | 'waived';
export type ComplianceType = 'operational' | 'brand' | 'financial' | 'training' | 'reporting' | 'quality';
export type ComplianceResult = 'pass' | 'fail' | 'warning';
export type ComplianceStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

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

interface FranchiseeContent {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  territory: string;
  franchiseFee: number;
  royaltyRate: number;
  status: FranchiseeStatus;
  joinedDate: string;
  franchiseType: FranchiseType;
  experience: string;
  financialStatus: FinancialStatus;
  location: string;
  notes: string;
}

interface AgreementContent {
  franchiseeId: string;
  agreementNumber: string;
  type: AgreementType;
  startDate: string;
  endDate: string | null;
  territory: string;
  initialFee: number;
  royaltyRate: number;
  advertisingFundRate: number;
  renewalTerms: string;
  terminationConditions: string;
  status: AgreementStatus;
  signedDate: string | null;
  notes: string;
}

interface TerritoryContent {
  name: string;
  description: string;
  boundaries: string;
  population: number;
  demographics: string;
  marketPotential: string;
  existingLocations: number;
  exclusivity: boolean;
  status: TerritoryStatus;
  assignedTo: string | null;
}

interface RoyaltyContent {
  franchiseeId: string;
  period: string;
  grossSales: number;
  royaltyRate: number;
  royaltyAmount: number;
  advertisingFundAmount: number;
  additionalFees: number;
  totalAmount: number;
  dueDate: string | null;
  paidDate: string | null;
  status: RoyaltyStatus;
  notes: string;
}

interface ComplianceContent {
  franchiseeId: string;
  type: ComplianceType;
  checkDate: string;
  checker: string;
  result: ComplianceResult;
  findings: string;
  correctiveActions: string;
  followUpDate: string | null;
  status: ComplianceStatus;
  resolution: string;
  resolvedBy: string;
  resolvedAt: string | null;
}

// ── Public interfaces ──

export interface Franchisee {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  territory: string;
  franchiseFee: number;
  royaltyRate: number;
  status: FranchiseeStatus;
  joinedDate: Date | null;
  franchiseType: FranchiseType;
  experience: string;
  financialStatus: FinancialStatus;
  location: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FranchiseAgreement {
  id: string;
  organizationId: string;
  workspaceId: string;
  franchiseeId: string;
  agreementNumber: string;
  type: AgreementType;
  startDate: Date;
  endDate: Date | null;
  territory: string;
  initialFee: number;
  royaltyRate: number;
  advertisingFundRate: number;
  renewalTerms: string;
  terminationConditions: string;
  status: AgreementStatus;
  signedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FranchiseTerritory {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  boundaries: string;
  population: number;
  demographics: string;
  marketPotential: string;
  existingLocations: number;
  exclusivity: boolean;
  status: TerritoryStatus;
  assignedTo: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FranchiseRoyalty {
  id: string;
  organizationId: string;
  workspaceId: string;
  franchiseeId: string;
  period: string;
  grossSales: number;
  royaltyRate: number;
  royaltyAmount: number;
  advertisingFundAmount: number;
  additionalFees: number;
  totalAmount: number;
  dueDate: Date | null;
  paidDate: Date | null;
  status: RoyaltyStatus;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FranchiseCompliance {
  id: string;
  organizationId: string;
  workspaceId: string;
  franchiseeId: string;
  type: ComplianceType;
  checkDate: Date;
  checker: string;
  result: ComplianceResult;
  findings: string;
  correctiveActions: string;
  followUpDate: Date | null;
  status: ComplianceStatus;
  resolution: string;
  resolvedBy: string;
  resolvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FranchiseMetrics {
  activeFranchisees: number;
  totalRoyalties: number;
  complianceRate: number;
  avgRevenuePerFranchisee: number;
  territoryUtilization: number;
}

export interface FranchiseStats {
  franchiseeCount: number;
  activeFranchiseeCount: number;
  agreementCount: number;
  activeAgreementCount: number;
  territoryCount: number;
  assignedTerritoryCount: number;
  royaltyCount: number;
  paidRoyaltyCount: number;
  totalRoyaltyAmount: number;
  complianceCount: number;
  openComplianceCount: number;
  complianceRate: number;
  byFranchiseeStatus: Record<string, number>;
  byAgreementStatus: Record<string, number>;
  byRoyaltyStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateFranchiseeInput {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  territory?: string;
  franchiseFee?: number;
  royaltyRate?: number;
  status?: FranchiseeStatus;
  joinedDate?: string;
  franchiseType?: FranchiseType;
  experience?: string;
  financialStatus?: FinancialStatus;
  location?: string;
  notes?: string;
}

export interface UpdateFranchiseeInput {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  territory?: string;
  franchiseFee?: number;
  royaltyRate?: number;
  status?: FranchiseeStatus;
  joinedDate?: string;
  franchiseType?: FranchiseType;
  experience?: string;
  financialStatus?: FinancialStatus;
  location?: string;
  notes?: string;
}

export interface ListFranchiseesOpts {
  status?: FranchiseeStatus;
  territory?: string;
  franchiseType?: FranchiseType;
}

export interface CreateAgreementInput {
  franchiseeId: string;
  agreementNumber: string;
  type: AgreementType;
  startDate: string;
  endDate?: string;
  territory?: string;
  initialFee?: number;
  royaltyRate?: number;
  advertisingFundRate?: number;
  renewalTerms?: string;
  terminationConditions?: string;
  status?: AgreementStatus;
  signedDate?: string;
  notes?: string;
}

export interface UpdateAgreementInput {
  type?: AgreementType;
  startDate?: string;
  endDate?: string;
  territory?: string;
  initialFee?: number;
  royaltyRate?: number;
  advertisingFundRate?: number;
  renewalTerms?: string;
  terminationConditions?: string;
  status?: AgreementStatus;
  signedDate?: string;
  notes?: string;
}

export interface ListAgreementsOpts {
  franchiseeId?: string;
  type?: AgreementType;
  status?: AgreementStatus;
}

export interface CreateTerritoryInput {
  name: string;
  description?: string;
  boundaries?: string;
  population?: number;
  demographics?: string;
  marketPotential?: string;
  existingLocations?: number;
  exclusivity?: boolean;
  status?: TerritoryStatus;
  assignedTo?: string;
}

export interface UpdateTerritoryInput {
  name?: string;
  description?: string;
  boundaries?: string;
  population?: number;
  demographics?: string;
  marketPotential?: string;
  existingLocations?: number;
  exclusivity?: boolean;
  status?: TerritoryStatus;
  assignedTo?: string;
}

export interface ListTerritoriesOpts {
  status?: TerritoryStatus;
  assignedTo?: string;
}

export interface CreateRoyaltyInput {
  franchiseeId: string;
  period: string;
  grossSales: number;
  royaltyRate: number;
  royaltyAmount?: number;
  advertisingFundAmount?: number;
  additionalFees?: number;
  totalAmount: number;
  dueDate?: string;
  paidDate?: string;
  status?: RoyaltyStatus;
  notes?: string;
}

export interface UpdateRoyaltyInput {
  period?: string;
  grossSales?: number;
  royaltyRate?: number;
  royaltyAmount?: number;
  advertisingFundAmount?: number;
  additionalFees?: number;
  totalAmount?: number;
  dueDate?: string;
  paidDate?: string;
  status?: RoyaltyStatus;
  notes?: string;
}

export interface ListRoyaltiesOpts {
  franchiseeId?: string;
  status?: RoyaltyStatus;
  period?: string;
}

export interface CreateComplianceInput {
  franchiseeId: string;
  type: ComplianceType;
  checkDate: string;
  checker: string;
  result: ComplianceResult;
  findings?: string;
  correctiveActions?: string;
  followUpDate?: string;
  status?: ComplianceStatus;
}

export interface UpdateComplianceInput {
  type?: ComplianceType;
  checkDate?: string;
  checker?: string;
  result?: ComplianceResult;
  findings?: string;
  correctiveActions?: string;
  followUpDate?: string;
  status?: ComplianceStatus;
}

export interface ListComplianceOpts {
  franchiseeId?: string;
  type?: ComplianceType;
  result?: ComplianceResult;
  status?: ComplianceStatus;
}

// ── Helpers ──

const fallbackFranchisee: FranchiseeContent = {
  name: '', contactName: '', contactEmail: '', contactPhone: '', territory: '',
  franchiseFee: 0, royaltyRate: 0, status: 'prospect', joinedDate: '', franchiseType: 'single_unit',
  experience: '', financialStatus: 'good_standing', location: '', notes: '',
};

const fallbackAgreement: AgreementContent = {
  franchiseeId: '', agreementNumber: '', type: 'single_unit', startDate: '', endDate: null,
  territory: '', initialFee: 0, royaltyRate: 0, advertisingFundRate: 0,
  renewalTerms: '', terminationConditions: '', status: 'draft', signedDate: null, notes: '',
};

const fallbackTerritory: TerritoryContent = {
  name: '', description: '', boundaries: '', population: 0, demographics: '',
  marketPotential: '', existingLocations: 0, exclusivity: true, status: 'available', assignedTo: null,
};

const fallbackRoyalty: RoyaltyContent = {
  franchiseeId: '', period: '', grossSales: 0, royaltyRate: 0, royaltyAmount: 0,
  advertisingFundAmount: 0, additionalFees: 0, totalAmount: 0, dueDate: null, paidDate: null,
  status: 'pending', notes: '',
};

const fallbackCompliance: ComplianceContent = {
  franchiseeId: '', type: 'operational', checkDate: '', checker: '', result: 'pass',
  findings: '', correctiveActions: '', followUpDate: null, status: 'closed',
  resolution: '', resolvedBy: '', resolvedAt: null,
};

function parseFranchisee(raw: string): FranchiseeContent {
  if (!raw) return fallbackFranchisee;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      contactName: p.contactName ?? '',
      contactEmail: p.contactEmail ?? '',
      contactPhone: p.contactPhone ?? '',
      territory: p.territory ?? '',
      franchiseFee: p.franchiseFee ?? 0,
      royaltyRate: p.royaltyRate ?? 0,
      status: (p.status as FranchiseeStatus) ?? 'prospect',
      joinedDate: p.joinedDate ?? '',
      franchiseType: (p.franchiseType as FranchiseType) ?? 'single_unit',
      experience: p.experience ?? '',
      financialStatus: (p.financialStatus as FinancialStatus) ?? 'good_standing',
      location: p.location ?? '',
      notes: p.notes ?? '',
    };
  } catch { return fallbackFranchisee; }
}

function parseAgreement(raw: string): AgreementContent {
  if (!raw) return fallbackAgreement;
  try {
    const p = JSON.parse(raw);
    return {
      franchiseeId: p.franchiseeId ?? '',
      agreementNumber: p.agreementNumber ?? '',
      type: (p.type as AgreementType) ?? 'single_unit',
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? null,
      territory: p.territory ?? '',
      initialFee: p.initialFee ?? 0,
      royaltyRate: p.royaltyRate ?? 0,
      advertisingFundRate: p.advertisingFundRate ?? 0,
      renewalTerms: p.renewalTerms ?? '',
      terminationConditions: p.terminationConditions ?? '',
      status: (p.status as AgreementStatus) ?? 'draft',
      signedDate: p.signedDate ?? null,
      notes: p.notes ?? '',
    };
  } catch { return fallbackAgreement; }
}

function parseTerritory(raw: string): TerritoryContent {
  if (!raw) return fallbackTerritory;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      description: p.description ?? '',
      boundaries: p.boundaries ?? '',
      population: p.population ?? 0,
      demographics: p.demographics ?? '',
      marketPotential: p.marketPotential ?? '',
      existingLocations: p.existingLocations ?? 0,
      exclusivity: p.exclusivity ?? true,
      status: (p.status as TerritoryStatus) ?? 'available',
      assignedTo: p.assignedTo ?? null,
    };
  } catch { return fallbackTerritory; }
}

function parseRoyalty(raw: string): RoyaltyContent {
  if (!raw) return fallbackRoyalty;
  try {
    const p = JSON.parse(raw);
    return {
      franchiseeId: p.franchiseeId ?? '',
      period: p.period ?? '',
      grossSales: p.grossSales ?? 0,
      royaltyRate: p.royaltyRate ?? 0,
      royaltyAmount: p.royaltyAmount ?? 0,
      advertisingFundAmount: p.advertisingFundAmount ?? 0,
      additionalFees: p.additionalFees ?? 0,
      totalAmount: p.totalAmount ?? 0,
      dueDate: p.dueDate ?? null,
      paidDate: p.paidDate ?? null,
      status: (p.status as RoyaltyStatus) ?? 'pending',
      notes: p.notes ?? '',
    };
  } catch { return fallbackRoyalty; }
}

function parseCompliance(raw: string): ComplianceContent {
  if (!raw) return fallbackCompliance;
  try {
    const p = JSON.parse(raw);
    return {
      franchiseeId: p.franchiseeId ?? '',
      type: (p.type as ComplianceType) ?? 'operational',
      checkDate: p.checkDate ?? '',
      checker: p.checker ?? '',
      result: (p.result as ComplianceResult) ?? 'pass',
      findings: p.findings ?? '',
      correctiveActions: p.correctiveActions ?? '',
      followUpDate: p.followUpDate ?? null,
      status: (p.status as ComplianceStatus) ?? 'closed',
      resolution: p.resolution ?? '',
      resolvedBy: p.resolvedBy ?? '',
      resolvedAt: p.resolvedAt ?? null,
    };
  } catch { return fallbackCompliance; }
}

function toFranchisee(row: MemoryRow): Franchisee {
  const c = parseFranchisee(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, contactName: c.contactName, contactEmail: c.contactEmail, contactPhone: c.contactPhone,
    territory: c.territory, franchiseFee: c.franchiseFee, royaltyRate: c.royaltyRate, status: c.status,
    joinedDate: c.joinedDate ? new Date(c.joinedDate) : null, franchiseType: c.franchiseType,
    experience: c.experience, financialStatus: c.financialStatus, location: c.location, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAgreement(row: MemoryRow): FranchiseAgreement {
  const c = parseAgreement(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    franchiseeId: c.franchiseeId, agreementNumber: c.agreementNumber, type: c.type,
    startDate: c.startDate ? new Date(c.startDate) : row.createdAt,
    endDate: c.endDate ? new Date(c.endDate) : null,
    territory: c.territory, initialFee: c.initialFee, royaltyRate: c.royaltyRate,
    advertisingFundRate: c.advertisingFundRate, renewalTerms: c.renewalTerms,
    terminationConditions: c.terminationConditions, status: c.status,
    signedDate: c.signedDate ? new Date(c.signedDate) : null, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTerritory(row: MemoryRow): FranchiseTerritory {
  const c = parseTerritory(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, description: c.description, boundaries: c.boundaries, population: c.population,
    demographics: c.demographics, marketPotential: c.marketPotential,
    existingLocations: c.existingLocations, exclusivity: c.exclusivity, status: c.status,
    assignedTo: c.assignedTo,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRoyalty(row: MemoryRow): FranchiseRoyalty {
  const c = parseRoyalty(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    franchiseeId: c.franchiseeId, period: c.period, grossSales: c.grossSales, royaltyRate: c.royaltyRate,
    royaltyAmount: c.royaltyAmount, advertisingFundAmount: c.advertisingFundAmount,
    additionalFees: c.additionalFees, totalAmount: c.totalAmount,
    dueDate: c.dueDate ? new Date(c.dueDate) : null,
    paidDate: c.paidDate ? new Date(c.paidDate) : null,
    status: c.status, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCompliance(row: MemoryRow): FranchiseCompliance {
  const c = parseCompliance(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    franchiseeId: c.franchiseeId, type: c.type,
    checkDate: c.checkDate ? new Date(c.checkDate) : row.createdAt,
    checker: c.checker, result: c.result, findings: c.findings, correctiveActions: c.correctiveActions,
    followUpDate: c.followUpDate ? new Date(c.followUpDate) : null,
    status: c.status, resolution: c.resolution, resolvedBy: c.resolvedBy,
    resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Franchise Service ──

export const FranchiseService = {
  // ── Franchisees ──

  async createFranchisee(
    organizationId: string,
    workspaceId: string,
    input: CreateFranchiseeInput,
    createdBy: string,
  ): Promise<Franchisee> {
    const content: FranchiseeContent = {
      name: input.name.trim(),
      contactName: input.contactName ?? '',
      contactEmail: input.contactEmail ?? '',
      contactPhone: input.contactPhone ?? '',
      territory: input.territory ?? '',
      franchiseFee: input.franchiseFee ?? 0,
      royaltyRate: input.royaltyRate ?? 0,
      status: input.status ?? 'prospect',
      joinedDate: input.joinedDate ?? '',
      franchiseType: input.franchiseType ?? 'single_unit',
      experience: input.experience ?? '',
      financialStatus: input.financialStatus ?? 'good_standing',
      location: input.location ?? '',
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'franchisee',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['franchisee', content.status, content.franchiseType]),
        createdBy,
      },
    });

    return toFranchisee(row as MemoryRow);
  },

  async getFranchisee(id: string): Promise<Franchisee | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'franchisee') return null;
    return toFranchisee(row as MemoryRow);
  },

  async listFranchisees(organizationId: string, opts: ListFranchiseesOpts = {}): Promise<Franchisee[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'franchisee', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toFranchisee(r as MemoryRow));
    if (opts.status) records = records.filter((f) => f.status === opts.status);
    if (opts.territory) records = records.filter((f) => f.territory === opts.territory);
    if (opts.franchiseType) records = records.filter((f) => f.franchiseType === opts.franchiseType);
    return records;
  },

  async updateFranchisee(id: string, input: UpdateFranchiseeInput): Promise<Franchisee | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFranchisee(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.contactName !== undefined) content.contactName = input.contactName;
    if (input.contactEmail !== undefined) content.contactEmail = input.contactEmail;
    if (input.contactPhone !== undefined) content.contactPhone = input.contactPhone;
    if (input.territory !== undefined) content.territory = input.territory;
    if (input.franchiseFee !== undefined) content.franchiseFee = input.franchiseFee;
    if (input.royaltyRate !== undefined) content.royaltyRate = input.royaltyRate;
    if (input.status !== undefined) content.status = input.status;
    if (input.joinedDate !== undefined) content.joinedDate = input.joinedDate;
    if (input.franchiseType !== undefined) content.franchiseType = input.franchiseType;
    if (input.experience !== undefined) content.experience = input.experience;
    if (input.financialStatus !== undefined) content.financialStatus = input.financialStatus;
    if (input.location !== undefined) content.location = input.location;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchisee', content.status, content.franchiseType]),
        },
      }), null,
    );
    if (!row) return null;
    return toFranchisee(row as MemoryRow);
  },

  async deleteFranchisee(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async activateFranchisee(id: string, activatedBy: string): Promise<Franchisee | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFranchisee(existing.content);
    content.status = 'active';
    if (!content.joinedDate) content.joinedDate = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchisee', 'active', content.franchiseType]),
          verifiedBy: activatedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toFranchisee(row as MemoryRow);
  },

  async terminateFranchisee(id: string, reason: string, terminatedBy: string): Promise<Franchisee | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFranchisee(existing.content);
    content.status = 'terminated';
    content.notes = content.notes
      ? `${content.notes}\n[Terminated by ${terminatedBy}: ${reason}]`
      : `[Terminated by ${terminatedBy}: ${reason}]`;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchisee', 'terminated', content.franchiseType]),
          verifiedBy: terminatedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toFranchisee(row as MemoryRow);
  },

  // ── Agreements ──

  async createAgreement(
    organizationId: string,
    workspaceId: string,
    input: CreateAgreementInput,
    createdBy: string,
  ): Promise<FranchiseAgreement> {
    const content: AgreementContent = {
      franchiseeId: input.franchiseeId,
      agreementNumber: input.agreementNumber.trim(),
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      territory: input.territory ?? '',
      initialFee: input.initialFee ?? 0,
      royaltyRate: input.royaltyRate ?? 0,
      advertisingFundRate: input.advertisingFundRate ?? 0,
      renewalTerms: input.renewalTerms ?? '',
      terminationConditions: input.terminationConditions ?? '',
      status: input.status ?? 'draft',
      signedDate: input.signedDate ?? null,
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'franchise_agreement',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.franchiseeId, confidence: 1.0, lifecycle: 'permanent',
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
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'franchise_agreement', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toAgreement(r as MemoryRow));
    if (opts.franchiseeId) records = records.filter((a) => a.franchiseeId === opts.franchiseeId);
    if (opts.type) records = records.filter((a) => a.type === opts.type);
    if (opts.status) records = records.filter((a) => a.status === opts.status);
    return records;
  },

  async updateAgreement(id: string, input: UpdateAgreementInput): Promise<FranchiseAgreement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAgreement(existing.content);
    if (input.type !== undefined) content.type = input.type;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.territory !== undefined) content.territory = input.territory;
    if (input.initialFee !== undefined) content.initialFee = input.initialFee;
    if (input.royaltyRate !== undefined) content.royaltyRate = input.royaltyRate;
    if (input.advertisingFundRate !== undefined) content.advertisingFundRate = input.advertisingFundRate;
    if (input.renewalTerms !== undefined) content.renewalTerms = input.renewalTerms;
    if (input.terminationConditions !== undefined) content.terminationConditions = input.terminationConditions;
    if (input.status !== undefined) content.status = input.status;
    if (input.signedDate !== undefined) content.signedDate = input.signedDate;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchise_agreement', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toAgreement(row as MemoryRow);
  },

  async signAgreement(id: string, signedBy: string): Promise<FranchiseAgreement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAgreement(existing.content);
    content.status = 'active';
    content.signedDate = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchise_agreement', content.type, 'active']),
          verifiedBy: signedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toAgreement(row as MemoryRow);
  },

  async renewAgreement(id: string, newEndDate: string, renewedBy: string): Promise<FranchiseAgreement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAgreement(existing.content);
    content.endDate = newEndDate;
    content.status = 'renewed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchise_agreement', content.type, 'renewed']),
          verifiedBy: renewedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toAgreement(row as MemoryRow);
  },

  async terminateAgreement(id: string, reason: string, terminatedBy: string): Promise<FranchiseAgreement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAgreement(existing.content);
    content.status = 'terminated';
    content.notes = content.notes
      ? `${content.notes}\n[Terminated by ${terminatedBy}: ${reason}]`
      : `[Terminated by ${terminatedBy}: ${reason}]`;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchise_agreement', content.type, 'terminated']),
          verifiedBy: terminatedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toAgreement(row as MemoryRow);
  },

  // ── Territories ──

  async createTerritory(
    organizationId: string,
    workspaceId: string,
    input: CreateTerritoryInput,
    createdBy: string,
  ): Promise<FranchiseTerritory> {
    const content: TerritoryContent = {
      name: input.name.trim(),
      description: input.description ?? '',
      boundaries: input.boundaries ?? '',
      population: input.population ?? 0,
      demographics: input.demographics ?? '',
      marketPotential: input.marketPotential ?? '',
      existingLocations: input.existingLocations ?? 0,
      exclusivity: input.exclusivity ?? true,
      status: input.status ?? 'available',
      assignedTo: input.assignedTo ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'franchise_territory',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.assignedTo ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['franchise_territory', content.status]),
        createdBy,
      },
    });

    return toTerritory(row as MemoryRow);
  },

  async getTerritory(id: string): Promise<FranchiseTerritory | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'franchise_territory') return null;
    return toTerritory(row as MemoryRow);
  },

  async listTerritories(organizationId: string, opts: ListTerritoriesOpts = {}): Promise<FranchiseTerritory[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'franchise_territory', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toTerritory(r as MemoryRow));
    if (opts.status) records = records.filter((t) => t.status === opts.status);
    if (opts.assignedTo) records = records.filter((t) => t.assignedTo === opts.assignedTo);
    return records;
  },

  async updateTerritory(id: string, input: UpdateTerritoryInput): Promise<FranchiseTerritory | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTerritory(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.boundaries !== undefined) content.boundaries = input.boundaries;
    if (input.population !== undefined) content.population = input.population;
    if (input.demographics !== undefined) content.demographics = input.demographics;
    if (input.marketPotential !== undefined) content.marketPotential = input.marketPotential;
    if (input.existingLocations !== undefined) content.existingLocations = input.existingLocations;
    if (input.exclusivity !== undefined) content.exclusivity = input.exclusivity;
    if (input.status !== undefined) content.status = input.status;
    if (input.assignedTo !== undefined) content.assignedTo = input.assignedTo;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchise_territory', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toTerritory(row as MemoryRow);
  },

  async deleteTerritory(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async assignTerritory(id: string, franchiseeId: string, assignedBy: string): Promise<FranchiseTerritory | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTerritory(existing.content);
    content.assignedTo = franchiseeId;
    content.status = 'assigned';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchise_territory', 'assigned']),
          sourceId: franchiseeId,
          verifiedBy: assignedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toTerritory(row as MemoryRow);
  },

  // ── Royalties ──

  async createRoyalty(
    organizationId: string,
    workspaceId: string,
    input: CreateRoyaltyInput,
    createdBy: string,
  ): Promise<FranchiseRoyalty> {
    const royaltyAmount = input.royaltyAmount ?? Number((input.grossSales * input.royaltyRate).toFixed(2));
    const content: RoyaltyContent = {
      franchiseeId: input.franchiseeId,
      period: input.period,
      grossSales: input.grossSales,
      royaltyRate: input.royaltyRate,
      royaltyAmount,
      advertisingFundAmount: input.advertisingFundAmount ?? 0,
      additionalFees: input.additionalFees ?? 0,
      totalAmount: input.totalAmount,
      dueDate: input.dueDate ?? null,
      paidDate: input.paidDate ?? null,
      status: input.status ?? 'pending',
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'franchise_royalty',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.franchiseeId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['franchise_royalty', content.status, content.period]),
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
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'franchise_royalty', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toRoyalty(r as MemoryRow));
    if (opts.franchiseeId) records = records.filter((r) => r.franchiseeId === opts.franchiseeId);
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    if (opts.period) records = records.filter((r) => r.period === opts.period);
    return records;
  },

  async updateRoyalty(id: string, input: UpdateRoyaltyInput): Promise<FranchiseRoyalty | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseRoyalty(existing.content);
    if (input.period !== undefined) content.period = input.period;
    if (input.grossSales !== undefined) content.grossSales = input.grossSales;
    if (input.royaltyRate !== undefined) content.royaltyRate = input.royaltyRate;
    if (input.royaltyAmount !== undefined) content.royaltyAmount = input.royaltyAmount;
    if (input.advertisingFundAmount !== undefined) content.advertisingFundAmount = input.advertisingFundAmount;
    if (input.additionalFees !== undefined) content.additionalFees = input.additionalFees;
    if (input.totalAmount !== undefined) content.totalAmount = input.totalAmount;
    if (input.dueDate !== undefined) content.dueDate = input.dueDate;
    if (input.paidDate !== undefined) content.paidDate = input.paidDate;
    if (input.status !== undefined) content.status = input.status;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchise_royalty', content.status, content.period]),
        },
      }), null,
    );
    if (!row) return null;
    return toRoyalty(row as MemoryRow);
  },

  async recordPayment(id: string, paidDate: string, recordedBy: string): Promise<FranchiseRoyalty | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseRoyalty(existing.content);
    content.paidDate = paidDate;
    content.status = 'paid';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchise_royalty', 'paid', content.period]),
          verifiedBy: recordedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toRoyalty(row as MemoryRow);
  },

  // ── Compliance ──

  async createCompliance(
    organizationId: string,
    workspaceId: string,
    input: CreateComplianceInput,
    createdBy: string,
  ): Promise<FranchiseCompliance> {
    const content: ComplianceContent = {
      franchiseeId: input.franchiseeId,
      type: input.type,
      checkDate: input.checkDate,
      checker: input.checker.trim(),
      result: input.result,
      findings: input.findings ?? '',
      correctiveActions: input.correctiveActions ?? '',
      followUpDate: input.followUpDate ?? null,
      status: input.status ?? (input.result === 'pass' ? 'closed' : 'open'),
      resolution: '',
      resolvedBy: '',
      resolvedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'franchise_compliance',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.franchiseeId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['franchise_compliance', content.type, content.result, content.status]),
        createdBy,
      },
    });

    return toCompliance(row as MemoryRow);
  },

  async getCompliance(id: string): Promise<FranchiseCompliance | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'franchise_compliance') return null;
    return toCompliance(row as MemoryRow);
  },

  async listCompliance(organizationId: string, opts: ListComplianceOpts = {}): Promise<FranchiseCompliance[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'franchise_compliance', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toCompliance(r as MemoryRow));
    if (opts.franchiseeId) records = records.filter((c) => c.franchiseeId === opts.franchiseeId);
    if (opts.type) records = records.filter((c) => c.type === opts.type);
    if (opts.result) records = records.filter((c) => c.result === opts.result);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    return records;
  },

  async updateCompliance(id: string, input: UpdateComplianceInput): Promise<FranchiseCompliance | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCompliance(existing.content);
    if (input.type !== undefined) content.type = input.type;
    if (input.checkDate !== undefined) content.checkDate = input.checkDate;
    if (input.checker !== undefined) content.checker = input.checker;
    if (input.result !== undefined) content.result = input.result;
    if (input.findings !== undefined) content.findings = input.findings;
    if (input.correctiveActions !== undefined) content.correctiveActions = input.correctiveActions;
    if (input.followUpDate !== undefined) content.followUpDate = input.followUpDate;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchise_compliance', content.type, content.result, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toCompliance(row as MemoryRow);
  },

  async resolveCompliance(id: string, resolution: string, resolvedBy: string): Promise<FranchiseCompliance | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCompliance(existing.content);
    content.status = 'resolved';
    content.resolution = resolution;
    content.resolvedBy = resolvedBy;
    content.resolvedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['franchise_compliance', content.type, content.result, 'resolved']),
          verifiedBy: resolvedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toCompliance(row as MemoryRow);
  },

  // ── Metrics ──

  async getFranchiseMetrics(organizationId: string): Promise<FranchiseMetrics> {
    const [franchisees, royalties, compliance, territories] = await Promise.all([
      FranchiseService.listFranchisees(organizationId),
      FranchiseService.listRoyalties(organizationId),
      FranchiseService.listCompliance(organizationId),
      FranchiseService.listTerritories(organizationId),
    ]);

    const activeFranchisees = franchisees.filter((f) => f.status === 'active').length;
    const totalRoyalties = royalties.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalChecks = compliance.length;
    const passingChecks = compliance.filter((c) => c.result === 'pass').length;
    const complianceRate = totalChecks > 0 ? Math.round((passingChecks / totalChecks) * 100) : 100;
    const totalRevenue = royalties.reduce((sum, r) => sum + r.grossSales, 0);
    const avgRevenuePerFranchisee = activeFranchisees > 0 ? Math.round(totalRevenue / activeFranchisees) : 0;
    const assignedTerritories = territories.filter((t) => t.status === 'assigned').length;
    const territoryUtilization = territories.length > 0
      ? Math.round((assignedTerritories / territories.length) * 100)
      : 0;

    return {
      activeFranchisees,
      totalRoyalties,
      complianceRate,
      avgRevenuePerFranchisee,
      territoryUtilization,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<FranchiseStats> {
    const [franchisees, agreements, territories, royalties, compliance] = await Promise.all([
      FranchiseService.listFranchisees(organizationId),
      FranchiseService.listAgreements(organizationId),
      FranchiseService.listTerritories(organizationId),
      FranchiseService.listRoyalties(organizationId),
      FranchiseService.listCompliance(organizationId),
    ]);

    const byFranchiseeStatus: Record<string, number> = {};
    for (const f of franchisees) {
      byFranchiseeStatus[f.status] = (byFranchiseeStatus[f.status] || 0) + 1;
    }

    const byAgreementStatus: Record<string, number> = {};
    for (const a of agreements) {
      byAgreementStatus[a.status] = (byAgreementStatus[a.status] || 0) + 1;
    }

    const byRoyaltyStatus: Record<string, number> = {};
    let paidRoyaltyCount = 0;
    let totalRoyaltyAmount = 0;
    for (const r of royalties) {
      byRoyaltyStatus[r.status] = (byRoyaltyStatus[r.status] || 0) + 1;
      if (r.status === 'paid') paidRoyaltyCount++;
      totalRoyaltyAmount += r.totalAmount;
    }

    let openComplianceCount = 0;
    let passingChecks = 0;
    for (const c of compliance) {
      if (c.status === 'open' || c.status === 'in_progress') openComplianceCount++;
      if (c.result === 'pass') passingChecks++;
    }
    const complianceRate = compliance.length > 0
      ? Math.round((passingChecks / compliance.length) * 100)
      : 100;

    return {
      franchiseeCount: franchisees.length,
      activeFranchiseeCount: franchisees.filter((f) => f.status === 'active').length,
      agreementCount: agreements.length,
      activeAgreementCount: agreements.filter((a) => a.status === 'active').length,
      territoryCount: territories.length,
      assignedTerritoryCount: territories.filter((t) => t.status === 'assigned').length,
      royaltyCount: royalties.length,
      paidRoyaltyCount,
      totalRoyaltyAmount,
      complianceCount: compliance.length,
      openComplianceCount,
      complianceRate,
      byFranchiseeStatus,
      byAgreementStatus,
      byRoyaltyStatus,
    };
  },
};
