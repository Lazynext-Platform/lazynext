import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PartnerType = 'reseller' | 'referral' | 'technology' | 'strategic' | 'distributor' | 'affiliate' | 'system_integrator';
export type PartnerTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'none';
export type PartnerStatus = 'active' | 'inactive' | 'suspended' | 'terminated';
export type ProgramType = 'channel' | 'alliance' | 'referral' | 'marketplace' | 'co_sell';
export type ProgramStatus = 'active' | 'inactive' | 'archived';
export type DealStage = 'registered' | 'qualified' | 'proposed' | 'negotiating' | 'closed_won' | 'closed_lost' | 'expired';
export type DealStatus = 'active' | 'inactive' | 'archived';
export type CoMarketingType = 'webinar' | 'event' | 'content' | 'email' | 'social' | 'co_branded' | 'other';
export type CoMarketingStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type TierLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

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

interface PartnerContent {
  name: string;
  type: PartnerType;
  tier: PartnerTier;
  status: PartnerStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  region: string;
  industry: string;
  website: string;
  dealRegistrationEnabled: boolean;
  marginRate: number | null;
  joinedDate: string | null;
  notes: string;
}

interface ProgramContent {
  name: string;
  description: string;
  type: ProgramType;
  requirements: string[];
  benefits: string[];
  marginRate: number | null;
  status: ProgramStatus;
  startDate: string | null;
  endDate: string | null;
}

interface DealContent {
  partnerId: string;
  customerName: string;
  dealValue: number;
  stage: DealStage;
  expectedCloseDate: string | null;
  description: string;
  dealType: string;
  margin: number | null;
  registeredDate: string;
  status: DealStatus;
  closedBy: string;
  closedAt: string | null;
  closeNotes: string;
}

interface CoMarketingContent {
  partnerId: string;
  campaignName: string;
  type: CoMarketingType;
  description: string;
  budget: number | null;
  costShare: number | null;
  startDate: string | null;
  endDate: string | null;
  status: CoMarketingStatus;
  expectedLeads: number | null;
  actualLeads: number | null;
  results: string;
  completedBy: string;
  completedAt: string | null;
}

interface TierContent {
  name: string;
  level: TierLevel;
  requirements: {
    minRevenue?: number;
    minDeals?: number;
    certificationRequired?: boolean;
    trainingRequired?: boolean;
  };
  benefits: {
    marginRate?: number;
    marketingFund?: number;
    dedicatedSupport?: boolean;
    leadSharing?: boolean;
    priorityListing?: boolean;
  };
  description: string;
}

// ── Public interfaces ──

export interface Partner {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PartnerType;
  tier: PartnerTier;
  status: PartnerStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  region: string;
  industry: string;
  website: string;
  dealRegistrationEnabled: boolean;
  marginRate: number | null;
  joinedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerProgram {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  type: ProgramType;
  requirements: string[];
  benefits: string[];
  marginRate: number | null;
  status: ProgramStatus;
  startDate: Date | null;
  endDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerDeal {
  id: string;
  organizationId: string;
  workspaceId: string;
  partnerId: string;
  customerName: string;
  dealValue: number;
  stage: DealStage;
  expectedCloseDate: Date | null;
  description: string;
  dealType: string;
  margin: number | null;
  registeredDate: Date;
  status: DealStatus;
  closedBy: string;
  closedAt: Date | null;
  closeNotes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoMarketing {
  id: string;
  organizationId: string;
  workspaceId: string;
  partnerId: string;
  campaignName: string;
  type: CoMarketingType;
  description: string;
  budget: number | null;
  costShare: number | null;
  startDate: Date | null;
  endDate: Date | null;
  status: CoMarketingStatus;
  expectedLeads: number | null;
  actualLeads: number | null;
  results: string;
  completedBy: string;
  completedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerTierDef {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  level: TierLevel;
  requirements: {
    minRevenue?: number;
    minDeals?: number;
    certificationRequired?: boolean;
    trainingRequired?: boolean;
  };
  benefits: {
    marginRate?: number;
    marketingFund?: number;
    dedicatedSupport?: boolean;
    leadSharing?: boolean;
    priorityListing?: boolean;
  };
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerMetrics {
  partnersByTier: Record<string, number>;
  activeDealsByStage: Record<string, number>;
  totalDealValue: number;
  coMarketingROI: number;
  partnerSourcedRevenue: number;
}

export interface PartnerStats {
  partnerCount: number;
  activePartnerCount: number;
  programCount: number;
  activeProgramCount: number;
  dealCount: number;
  activeDealCount: number;
  closedWonDealCount: number;
  totalDealValue: number;
  coMarketingCount: number;
  activeCoMarketingCount: number;
  tierCount: number;
  byPartnerType: Record<string, number>;
  byPartnerTier: Record<string, number>;
  byDealStage: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePartnerInput {
  name: string;
  type: PartnerType;
  tier?: PartnerTier;
  status?: PartnerStatus;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  region?: string;
  industry?: string;
  website?: string;
  dealRegistrationEnabled?: boolean;
  marginRate?: number;
  joinedDate?: string;
  notes?: string;
}

export interface UpdatePartnerInput {
  name?: string;
  type?: PartnerType;
  tier?: PartnerTier;
  status?: PartnerStatus;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  region?: string;
  industry?: string;
  website?: string;
  dealRegistrationEnabled?: boolean;
  marginRate?: number;
  joinedDate?: string;
  notes?: string;
}

export interface ListPartnersOpts {
  type?: PartnerType;
  tier?: PartnerTier;
  status?: PartnerStatus;
  region?: string;
}

export interface CreateProgramInput {
  name: string;
  description?: string;
  type: ProgramType;
  requirements?: string[];
  benefits?: string[];
  marginRate?: number;
  status?: ProgramStatus;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProgramInput {
  name?: string;
  description?: string;
  type?: ProgramType;
  requirements?: string[];
  benefits?: string[];
  marginRate?: number;
  status?: ProgramStatus;
  startDate?: string;
  endDate?: string;
}

export interface ListProgramsOpts {
  type?: ProgramType;
  status?: ProgramStatus;
}

export interface CreateDealInput {
  partnerId: string;
  customerName: string;
  dealValue: number;
  stage: DealStage;
  expectedCloseDate?: string;
  description?: string;
  dealType?: string;
  margin?: number;
  registeredDate?: string;
  status?: DealStatus;
}

export interface UpdateDealInput {
  partnerId?: string;
  customerName?: string;
  dealValue?: number;
  stage?: DealStage;
  expectedCloseDate?: string;
  description?: string;
  dealType?: string;
  margin?: number;
  registeredDate?: string;
  status?: DealStatus;
}

export interface ListDealsOpts {
  partnerId?: string;
  stage?: DealStage;
  status?: DealStatus;
}

export interface CreateCoMarketingInput {
  partnerId: string;
  campaignName: string;
  type: CoMarketingType;
  description?: string;
  budget?: number;
  costShare?: number;
  startDate?: string;
  endDate?: string;
  status?: CoMarketingStatus;
  expectedLeads?: number;
  actualLeads?: number;
}

export interface UpdateCoMarketingInput {
  partnerId?: string;
  campaignName?: string;
  type?: CoMarketingType;
  description?: string;
  budget?: number;
  costShare?: number;
  startDate?: string;
  endDate?: string;
  status?: CoMarketingStatus;
  expectedLeads?: number;
  actualLeads?: number;
}

export interface ListCoMarketingOpts {
  partnerId?: string;
  type?: CoMarketingType;
  status?: CoMarketingStatus;
}

export interface CreateTierInput {
  name: string;
  level: TierLevel;
  requirements: {
    minRevenue?: number;
    minDeals?: number;
    certificationRequired?: boolean;
    trainingRequired?: boolean;
  };
  benefits: {
    marginRate?: number;
    marketingFund?: number;
    dedicatedSupport?: boolean;
    leadSharing?: boolean;
    priorityListing?: boolean;
  };
  description?: string;
}

export interface UpdateTierInput {
  name?: string;
  level?: TierLevel;
  requirements?: {
    minRevenue?: number;
    minDeals?: number;
    certificationRequired?: boolean;
    trainingRequired?: boolean;
  };
  benefits?: {
    marginRate?: number;
    marketingFund?: number;
    dedicatedSupport?: boolean;
    leadSharing?: boolean;
    priorityListing?: boolean;
  };
  description?: string;
}

// ── Helpers ──

const fallbackPartner: PartnerContent = {
  name: '', type: 'reseller', tier: 'none', status: 'active',
  contactName: '', contactEmail: '', contactPhone: '', region: '', industry: '', website: '',
  dealRegistrationEnabled: false, marginRate: null, joinedDate: null, notes: '',
};

const fallbackProgram: ProgramContent = {
  name: '', description: '', type: 'channel', requirements: [], benefits: [], marginRate: null,
  status: 'active', startDate: null, endDate: null,
};

const fallbackDeal: DealContent = {
  partnerId: '', customerName: '', dealValue: 0, stage: 'registered', expectedCloseDate: null,
  description: '', dealType: '', margin: null, registeredDate: '', status: 'active',
  closedBy: '', closedAt: null, closeNotes: '',
};

const fallbackCoMarketing: CoMarketingContent = {
  partnerId: '', campaignName: '', type: 'webinar', description: '', budget: null, costShare: null,
  startDate: null, endDate: null, status: 'planned', expectedLeads: null, actualLeads: null,
  results: '', completedBy: '', completedAt: null,
};

const fallbackTier: TierContent = {
  name: '', level: 'bronze', requirements: {}, benefits: {}, description: '',
};

function parsePartner(raw: string): PartnerContent {
  if (!raw) return fallbackPartner;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      type: (p.type as PartnerType) ?? 'reseller',
      tier: (p.tier as PartnerTier) ?? 'none',
      status: (p.status as PartnerStatus) ?? 'active',
      contactName: p.contactName ?? '',
      contactEmail: p.contactEmail ?? '',
      contactPhone: p.contactPhone ?? '',
      region: p.region ?? '',
      industry: p.industry ?? '',
      website: p.website ?? '',
      dealRegistrationEnabled: p.dealRegistrationEnabled ?? false,
      marginRate: p.marginRate ?? null,
      joinedDate: p.joinedDate ?? null,
      notes: p.notes ?? '',
    };
  } catch { return fallbackPartner; }
}

function parseProgram(raw: string): ProgramContent {
  if (!raw) return fallbackProgram;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      description: p.description ?? '',
      type: (p.type as ProgramType) ?? 'channel',
      requirements: Array.isArray(p.requirements) ? p.requirements : [],
      benefits: Array.isArray(p.benefits) ? p.benefits : [],
      marginRate: p.marginRate ?? null,
      status: (p.status as ProgramStatus) ?? 'active',
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
    };
  } catch { return fallbackProgram; }
}

function parseDeal(raw: string): DealContent {
  if (!raw) return fallbackDeal;
  try {
    const p = JSON.parse(raw);
    return {
      partnerId: p.partnerId ?? '',
      customerName: p.customerName ?? '',
      dealValue: p.dealValue ?? 0,
      stage: (p.stage as DealStage) ?? 'registered',
      expectedCloseDate: p.expectedCloseDate ?? null,
      description: p.description ?? '',
      dealType: p.dealType ?? '',
      margin: p.margin ?? null,
      registeredDate: p.registeredDate ?? '',
      status: (p.status as DealStatus) ?? 'active',
      closedBy: p.closedBy ?? '',
      closedAt: p.closedAt ?? null,
      closeNotes: p.closeNotes ?? '',
    };
  } catch { return fallbackDeal; }
}

function parseCoMarketing(raw: string): CoMarketingContent {
  if (!raw) return fallbackCoMarketing;
  try {
    const p = JSON.parse(raw);
    return {
      partnerId: p.partnerId ?? '',
      campaignName: p.campaignName ?? '',
      type: (p.type as CoMarketingType) ?? 'webinar',
      description: p.description ?? '',
      budget: p.budget ?? null,
      costShare: p.costShare ?? null,
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
      status: (p.status as CoMarketingStatus) ?? 'planned',
      expectedLeads: p.expectedLeads ?? null,
      actualLeads: p.actualLeads ?? null,
      results: p.results ?? '',
      completedBy: p.completedBy ?? '',
      completedAt: p.completedAt ?? null,
    };
  } catch { return fallbackCoMarketing; }
}

function parseTier(raw: string): TierContent {
  if (!raw) return fallbackTier;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      level: (p.level as TierLevel) ?? 'bronze',
      requirements: p.requirements ?? {},
      benefits: p.benefits ?? {},
      description: p.description ?? '',
    };
  } catch { return fallbackTier; }
}

function toPartner(row: MemoryRow): Partner {
  const c = parsePartner(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, type: c.type, tier: c.tier, status: c.status,
    contactName: c.contactName, contactEmail: c.contactEmail, contactPhone: c.contactPhone,
    region: c.region, industry: c.industry, website: c.website,
    dealRegistrationEnabled: c.dealRegistrationEnabled, marginRate: c.marginRate,
    joinedDate: c.joinedDate ? new Date(c.joinedDate) : null,
    notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toProgram(row: MemoryRow): PartnerProgram {
  const c = parseProgram(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, description: c.description, type: c.type,
    requirements: c.requirements, benefits: c.benefits, marginRate: c.marginRate,
    status: c.status,
    startDate: c.startDate ? new Date(c.startDate) : null,
    endDate: c.endDate ? new Date(c.endDate) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDeal(row: MemoryRow): PartnerDeal {
  const c = parseDeal(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    partnerId: c.partnerId, customerName: c.customerName, dealValue: c.dealValue,
    stage: c.stage, expectedCloseDate: c.expectedCloseDate ? new Date(c.expectedCloseDate) : null,
    description: c.description, dealType: c.dealType, margin: c.margin,
    registeredDate: c.registeredDate ? new Date(c.registeredDate) : row.createdAt,
    status: c.status, closedBy: c.closedBy,
    closedAt: c.closedAt ? new Date(c.closedAt) : null, closeNotes: c.closeNotes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCoMarketing(row: MemoryRow): CoMarketing {
  const c = parseCoMarketing(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    partnerId: c.partnerId, campaignName: c.campaignName, type: c.type,
    description: c.description, budget: c.budget, costShare: c.costShare,
    startDate: c.startDate ? new Date(c.startDate) : null,
    endDate: c.endDate ? new Date(c.endDate) : null,
    status: c.status, expectedLeads: c.expectedLeads, actualLeads: c.actualLeads,
    results: c.results, completedBy: c.completedBy,
    completedAt: c.completedAt ? new Date(c.completedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTier(row: MemoryRow): PartnerTierDef {
  const c = parseTier(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, level: c.level, requirements: c.requirements, benefits: c.benefits,
    description: c.description,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Partner Service ──

export const PartnerService = {
  // ── Partners ──

  async createPartner(
    organizationId: string,
    workspaceId: string,
    input: CreatePartnerInput,
    createdBy: string,
  ): Promise<Partner> {
    const content: PartnerContent = {
      name: input.name.trim(),
      type: input.type,
      tier: input.tier ?? 'none',
      status: input.status ?? 'active',
      contactName: input.contactName ?? '',
      contactEmail: input.contactEmail ?? '',
      contactPhone: input.contactPhone ?? '',
      region: input.region ?? '',
      industry: input.industry ?? '',
      website: input.website ?? '',
      dealRegistrationEnabled: input.dealRegistrationEnabled ?? false,
      marginRate: input.marginRate ?? null,
      joinedDate: input.joinedDate ?? null,
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'partner_profile',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['partner_profile', content.type, content.tier, content.status]),
        createdBy,
      },
    });

    return toPartner(row as MemoryRow);
  },

  async getPartner(id: string): Promise<Partner | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'partner_profile') return null;
    return toPartner(row as MemoryRow);
  },

  async listPartners(organizationId: string, opts: ListPartnersOpts = {}): Promise<Partner[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'partner_profile', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toPartner(r as MemoryRow));
    if (opts.type) records = records.filter((p) => p.type === opts.type);
    if (opts.tier) records = records.filter((p) => p.tier === opts.tier);
    if (opts.status) records = records.filter((p) => p.status === opts.status);
    if (opts.region) records = records.filter((p) => p.region === opts.region);
    return records;
  },

  async updatePartner(id: string, input: UpdatePartnerInput): Promise<Partner | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parsePartner(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.tier !== undefined) content.tier = input.tier;
    if (input.status !== undefined) content.status = input.status;
    if (input.contactName !== undefined) content.contactName = input.contactName;
    if (input.contactEmail !== undefined) content.contactEmail = input.contactEmail;
    if (input.contactPhone !== undefined) content.contactPhone = input.contactPhone;
    if (input.region !== undefined) content.region = input.region;
    if (input.industry !== undefined) content.industry = input.industry;
    if (input.website !== undefined) content.website = input.website;
    if (input.dealRegistrationEnabled !== undefined) content.dealRegistrationEnabled = input.dealRegistrationEnabled;
    if (input.marginRate !== undefined) content.marginRate = input.marginRate;
    if (input.joinedDate !== undefined) content.joinedDate = input.joinedDate;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['partner_profile', content.type, content.tier, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toPartner(row as MemoryRow);
  },

  async deletePartner(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async upgradeTier(id: string, newTier: PartnerTier, upgradedBy: string): Promise<Partner | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parsePartner(existing.content);
    content.tier = newTier;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['partner_profile', content.type, content.tier, content.status]),
          owner: upgradedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toPartner(row as MemoryRow);
  },

  // ── Programs ──

  async createProgram(
    organizationId: string,
    workspaceId: string,
    input: CreateProgramInput,
    createdBy: string,
  ): Promise<PartnerProgram> {
    const content: ProgramContent = {
      name: input.name.trim(),
      description: input.description ?? '',
      type: input.type,
      requirements: input.requirements ?? [],
      benefits: input.benefits ?? [],
      marginRate: input.marginRate ?? null,
      status: input.status ?? 'active',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'partner_program',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['partner_program', content.type, content.status]),
        createdBy,
      },
    });

    return toProgram(row as MemoryRow);
  },

  async getProgram(id: string): Promise<PartnerProgram | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'partner_program') return null;
    return toProgram(row as MemoryRow);
  },

  async listPrograms(organizationId: string, opts: ListProgramsOpts = {}): Promise<PartnerProgram[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'partner_program', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toProgram(r as MemoryRow));
    if (opts.type) records = records.filter((p) => p.type === opts.type);
    if (opts.status) records = records.filter((p) => p.status === opts.status);
    return records;
  },

  async updateProgram(id: string, input: UpdateProgramInput): Promise<PartnerProgram | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseProgram(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.type !== undefined) content.type = input.type;
    if (input.requirements !== undefined) content.requirements = input.requirements;
    if (input.benefits !== undefined) content.benefits = input.benefits;
    if (input.marginRate !== undefined) content.marginRate = input.marginRate;
    if (input.status !== undefined) content.status = input.status;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['partner_program', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toProgram(row as MemoryRow);
  },

  async deleteProgram(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Deals ──

  async createDeal(
    organizationId: string,
    workspaceId: string,
    input: CreateDealInput,
    createdBy: string,
  ): Promise<PartnerDeal> {
    const content: DealContent = {
      partnerId: input.partnerId,
      customerName: input.customerName.trim(),
      dealValue: input.dealValue,
      stage: input.stage,
      expectedCloseDate: input.expectedCloseDate ?? null,
      description: input.description ?? '',
      dealType: input.dealType ?? '',
      margin: input.margin ?? null,
      registeredDate: input.registeredDate ?? new Date().toISOString(),
      status: input.status ?? 'active',
      closedBy: '',
      closedAt: null,
      closeNotes: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'partner_deal',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.partnerId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['partner_deal', content.stage, content.status]),
        createdBy,
      },
    });

    return toDeal(row as MemoryRow);
  },

  async getDeal(id: string): Promise<PartnerDeal | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'partner_deal') return null;
    return toDeal(row as MemoryRow);
  },

  async listDeals(organizationId: string, opts: ListDealsOpts = {}): Promise<PartnerDeal[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'partner_deal', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toDeal(r as MemoryRow));
    if (opts.partnerId) records = records.filter((d) => d.partnerId === opts.partnerId);
    if (opts.stage) records = records.filter((d) => d.stage === opts.stage);
    if (opts.status) records = records.filter((d) => d.status === opts.status);
    return records;
  },

  async updateDeal(id: string, input: UpdateDealInput): Promise<PartnerDeal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDeal(existing.content);
    if (input.partnerId !== undefined) content.partnerId = input.partnerId;
    if (input.customerName !== undefined) content.customerName = input.customerName.trim();
    if (input.dealValue !== undefined) content.dealValue = input.dealValue;
    if (input.stage !== undefined) content.stage = input.stage;
    if (input.expectedCloseDate !== undefined) content.expectedCloseDate = input.expectedCloseDate;
    if (input.description !== undefined) content.description = input.description;
    if (input.dealType !== undefined) content.dealType = input.dealType;
    if (input.margin !== undefined) content.margin = input.margin;
    if (input.registeredDate !== undefined) content.registeredDate = input.registeredDate;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['partner_deal', content.stage, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toDeal(row as MemoryRow);
  },

  async closeDeal(id: string, stage: 'closed_won' | 'closed_lost', closedBy: string, notes?: string): Promise<PartnerDeal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDeal(existing.content);
    content.stage = stage;
    content.status = 'inactive';
    content.closedBy = closedBy;
    content.closedAt = new Date().toISOString();
    content.closeNotes = notes ?? '';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['partner_deal', content.stage, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toDeal(row as MemoryRow);
  },

  // ── Co-Marketing ──

  async createCoMarketing(
    organizationId: string,
    workspaceId: string,
    input: CreateCoMarketingInput,
    createdBy: string,
  ): Promise<CoMarketing> {
    const content: CoMarketingContent = {
      partnerId: input.partnerId,
      campaignName: input.campaignName.trim(),
      type: input.type,
      description: input.description ?? '',
      budget: input.budget ?? null,
      costShare: input.costShare ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      status: input.status ?? 'planned',
      expectedLeads: input.expectedLeads ?? null,
      actualLeads: input.actualLeads ?? null,
      results: '',
      completedBy: '',
      completedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'partner_comarketing',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.partnerId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['partner_comarketing', content.type, content.status]),
        createdBy,
      },
    });

    return toCoMarketing(row as MemoryRow);
  },

  async getCoMarketing(id: string): Promise<CoMarketing | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'partner_comarketing') return null;
    return toCoMarketing(row as MemoryRow);
  },

  async listCoMarketing(organizationId: string, opts: ListCoMarketingOpts = {}): Promise<CoMarketing[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'partner_comarketing', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toCoMarketing(r as MemoryRow));
    if (opts.partnerId) records = records.filter((c) => c.partnerId === opts.partnerId);
    if (opts.type) records = records.filter((c) => c.type === opts.type);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    return records;
  },

  async updateCoMarketing(id: string, input: UpdateCoMarketingInput): Promise<CoMarketing | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCoMarketing(existing.content);
    if (input.partnerId !== undefined) content.partnerId = input.partnerId;
    if (input.campaignName !== undefined) content.campaignName = input.campaignName.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.description !== undefined) content.description = input.description;
    if (input.budget !== undefined) content.budget = input.budget;
    if (input.costShare !== undefined) content.costShare = input.costShare;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.status !== undefined) content.status = input.status;
    if (input.expectedLeads !== undefined) content.expectedLeads = input.expectedLeads;
    if (input.actualLeads !== undefined) content.actualLeads = input.actualLeads;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['partner_comarketing', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toCoMarketing(row as MemoryRow);
  },

  async completeCoMarketing(id: string, results: string, completedBy: string): Promise<CoMarketing | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCoMarketing(existing.content);
    content.status = 'completed';
    content.results = results;
    content.completedBy = completedBy;
    content.completedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['partner_comarketing', content.type, 'completed']),
        },
      }), null,
    );
    if (!row) return null;
    return toCoMarketing(row as MemoryRow);
  },

  // ── Tiers ──

  async createTier(
    organizationId: string,
    workspaceId: string,
    input: CreateTierInput,
    createdBy: string,
  ): Promise<PartnerTierDef> {
    const content: TierContent = {
      name: input.name.trim(),
      level: input.level,
      requirements: input.requirements,
      benefits: input.benefits,
      description: input.description ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'partner_tier',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['partner_tier', content.level]),
        createdBy,
      },
    });

    return toTier(row as MemoryRow);
  },

  async getTier(id: string): Promise<PartnerTierDef | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'partner_tier') return null;
    return toTier(row as MemoryRow);
  },

  async listTiers(organizationId: string): Promise<PartnerTierDef[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'partner_tier', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    return rows.map((r) => toTier(r as MemoryRow));
  },

  async updateTier(id: string, input: UpdateTierInput): Promise<PartnerTierDef | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTier(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.level !== undefined) content.level = input.level;
    if (input.requirements !== undefined) content.requirements = input.requirements;
    if (input.benefits !== undefined) content.benefits = input.benefits;
    if (input.description !== undefined) content.description = input.description;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['partner_tier', content.level]),
        },
      }), null,
    );
    if (!row) return null;
    return toTier(row as MemoryRow);
  },

  async deleteTier(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Metrics ──

  async getPartnerMetrics(organizationId: string): Promise<PartnerMetrics> {
    const [partners, deals, coMarketing] = await Promise.all([
      PartnerService.listPartners(organizationId),
      PartnerService.listDeals(organizationId),
      PartnerService.listCoMarketing(organizationId),
    ]);

    const partnersByTier: Record<string, number> = {};
    for (const p of partners) {
      partnersByTier[p.tier] = (partnersByTier[p.tier] || 0) + 1;
    }

    const activeDealsByStage: Record<string, number> = {};
    let totalDealValue = 0;
    let partnerSourcedRevenue = 0;
    for (const d of deals) {
      if (d.status === 'active') {
        activeDealsByStage[d.stage] = (activeDealsByStage[d.stage] || 0) + 1;
      }
      if (d.stage === 'closed_won') {
        totalDealValue += d.dealValue;
        partnerSourcedRevenue += d.dealValue;
      }
    }

    let totalBudget = 0;
    let totalLeads = 0;
    for (const c of coMarketing) {
      if (c.budget) totalBudget += c.budget;
      if (c.actualLeads) totalLeads += c.actualLeads;
    }
    const coMarketingROI = totalBudget > 0 ? Math.round((totalLeads / totalBudget) * 100) : 0;

    return {
      partnersByTier,
      activeDealsByStage,
      totalDealValue,
      coMarketingROI,
      partnerSourcedRevenue,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<PartnerStats> {
    const [partners, programs, deals, coMarketing, tiers] = await Promise.all([
      PartnerService.listPartners(organizationId),
      PartnerService.listPrograms(organizationId),
      PartnerService.listDeals(organizationId),
      PartnerService.listCoMarketing(organizationId),
      PartnerService.listTiers(organizationId),
    ]);

    const byPartnerType: Record<string, number> = {};
    const byPartnerTier: Record<string, number> = {};
    let activePartnerCount = 0;
    for (const p of partners) {
      byPartnerType[p.type] = (byPartnerType[p.type] || 0) + 1;
      byPartnerTier[p.tier] = (byPartnerTier[p.tier] || 0) + 1;
      if (p.status === 'active') activePartnerCount++;
    }

    const byDealStage: Record<string, number> = {};
    let activeDealCount = 0;
    let closedWonDealCount = 0;
    let totalDealValue = 0;
    for (const d of deals) {
      byDealStage[d.stage] = (byDealStage[d.stage] || 0) + 1;
      if (d.status === 'active') activeDealCount++;
      if (d.stage === 'closed_won') {
        closedWonDealCount++;
        totalDealValue += d.dealValue;
      }
    }

    let activeProgramCount = 0;
    for (const p of programs) {
      if (p.status === 'active') activeProgramCount++;
    }

    let activeCoMarketingCount = 0;
    for (const c of coMarketing) {
      if (c.status === 'active') activeCoMarketingCount++;
    }

    return {
      partnerCount: partners.length,
      activePartnerCount,
      programCount: programs.length,
      activeProgramCount,
      dealCount: deals.length,
      activeDealCount,
      closedWonDealCount,
      totalDealValue,
      coMarketingCount: coMarketing.length,
      activeCoMarketingCount,
      tierCount: tiers.length,
      byPartnerType,
      byPartnerTier,
      byDealStage,
    };
  },
};
