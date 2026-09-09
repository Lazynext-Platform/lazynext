import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type TargetStatus = 'identified' | 'researching' | 'contacted' | 'interested' | 'not_interested' | 'acquired' | 'archived';
export type OwnershipType = 'private' | 'public' | 'subsidiary' | 'other';
export type DealType = 'acquisition' | 'merger' | 'divestiture' | 'joint_venture' | 'minority_stake';
export type DealStatus = 'pipeline' | 'initial_contact' | 'negotiation' | 'letter_of_intent' | 'due_diligence' | 'definitive_agreement' | 'closing' | 'completed' | 'terminated';
export type DDArea = 'financial' | 'legal' | 'operational' | 'commercial' | 'technology' | 'hr' | 'environmental' | 'tax';
export type DDItemStatus = 'pending' | 'in_progress' | 'complete' | 'flagged';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type DDStatus = 'pending' | 'in_progress' | 'complete' | 'flagged';
export type IntegrationStatus = 'planning' | 'in_progress' | 'complete' | 'on_hold' | 'cancelled';
export type WorkstreamStatus = 'not_started' | 'in_progress' | 'complete' | 'delayed' | 'blocked';
export type SynergyType = 'cost' | 'revenue' | 'operational' | 'financial';
export type ValuationMethod = 'dcf' | 'comparable_company' | 'comparable_transaction' | 'asset_based' | 'market' | 'lbo';

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

interface TargetContent {
  name: string;
  industry: string;
  location: string;
  revenue: number | null;
  employees: number | null;
  description: string;
  website: string;
  ownershipType: OwnershipType;
  strategicFit: string;
  status: TargetStatus;
  contactName: string;
  contactEmail: string;
}

interface DealContent {
  targetId: string;
  name: string;
  type: DealType;
  status: DealStatus;
  dealValue: number | null;
  structure: string;
  expectedCloseDate: string | null;
  lead: string;
  team: string[];
  terminatedReason: string | null;
  terminatedBy: string | null;
  terminatedAt: string | null;
  advancedBy: string | null;
  advancedAt: string | null;
}

interface DDItem {
  area: DDArea;
  status: DDItemStatus;
  findings: string;
  riskLevel: RiskLevel;
  owner: string;
}

interface DueDiligenceContent {
  dealId: string;
  areas: DDItem[];
  status: DDStatus;
  startDate: string;
  endDate: string | null;
  summary: string;
  completedBy: string | null;
  completedAt: string | null;
}

interface Milestone {
  name: string;
  date: string | null;
  completed: boolean;
}

interface Workstream {
  name: string;
  owner: string;
  status: WorkstreamStatus;
  startDate: string | null;
  endDate: string | null;
  milestones: Milestone[];
}

interface Synergy {
  type: SynergyType;
  description: string;
  estimatedValue: number | null;
  realizedValue: number | null;
}

interface IntegrationContent {
  dealId: string;
  name: string;
  workstreams: Workstream[];
  timeline: string;
  budget: number | null;
  status: IntegrationStatus;
  synergies: Synergy[];
  risks: string[];
  summary: string;
  completedBy: string | null;
  completedAt: string | null;
}

interface ValuationContent {
  targetId: string;
  method: ValuationMethod;
  value: number;
  rangeLow: number | null;
  rangeHigh: number | null;
  assumptions: string;
  multiples: string;
  date: string;
  analyst: string;
}

// ── Public interfaces ──

export interface MATarget {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  industry: string;
  location: string;
  revenue: number | null;
  employees: number | null;
  description: string;
  website: string;
  ownershipType: OwnershipType;
  strategicFit: string;
  status: TargetStatus;
  contactName: string;
  contactEmail: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MADeal {
  id: string;
  organizationId: string;
  workspaceId: string;
  targetId: string;
  name: string;
  type: DealType;
  status: DealStatus;
  dealValue: number | null;
  structure: string;
  expectedCloseDate: Date | null;
  lead: string;
  team: string[];
  terminatedReason: string | null;
  terminatedBy: string | null;
  terminatedAt: Date | null;
  advancedBy: string | null;
  advancedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DueDiligenceItem {
  area: DDArea;
  status: DDItemStatus;
  findings: string;
  riskLevel: RiskLevel;
  owner: string;
}

export interface DueDiligence {
  id: string;
  organizationId: string;
  workspaceId: string;
  dealId: string;
  areas: DueDiligenceItem[];
  status: DDStatus;
  startDate: Date;
  endDate: Date | null;
  summary: string;
  completedBy: string | null;
  completedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationWorkstream {
  name: string;
  owner: string;
  status: WorkstreamStatus;
  startDate: Date | null;
  endDate: Date | null;
  milestones: Array<{ name: string; date: Date | null; completed: boolean }>;
}

export interface IntegrationSynergy {
  type: SynergyType;
  description: string;
  estimatedValue: number | null;
  realizedValue: number | null;
}

export interface Integration {
  id: string;
  organizationId: string;
  workspaceId: string;
  dealId: string;
  name: string;
  workstreams: IntegrationWorkstream[];
  timeline: string;
  budget: number | null;
  status: IntegrationStatus;
  synergies: IntegrationSynergy[];
  risks: string[];
  summary: string;
  completedBy: string | null;
  completedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Valuation {
  id: string;
  organizationId: string;
  workspaceId: string;
  targetId: string;
  method: ValuationMethod;
  value: number;
  rangeLow: number | null;
  rangeHigh: number | null;
  assumptions: string;
  multiples: string;
  date: Date;
  analyst: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MAMetrics {
  pipelineValueByStage: Record<string, number>;
  activeDeals: number;
  ddCompletionRate: number;
  integrationSynergyRealized: number;
  avgDealCycleDays: number;
}

export interface MAStats {
  targetCount: number;
  dealCount: number;
  activeDealCount: number;
  completedDealCount: number;
  terminatedDealCount: number;
  dueDiligenceCount: number;
  integrationCount: number;
  valuationCount: number;
  totalPipelineValue: number;
  byDealStatus: Record<string, number>;
  byDealType: Record<string, number>;
  byTargetStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateTargetInput {
  name: string;
  industry: string;
  location?: string;
  revenue?: number;
  employees?: number;
  description?: string;
  website?: string;
  ownershipType?: OwnershipType;
  strategicFit?: string;
  status?: TargetStatus;
  contactName?: string;
  contactEmail?: string;
}

export interface UpdateTargetInput {
  name?: string;
  industry?: string;
  location?: string;
  revenue?: number;
  employees?: number;
  description?: string;
  website?: string;
  ownershipType?: OwnershipType;
  strategicFit?: string;
  status?: TargetStatus;
  contactName?: string;
  contactEmail?: string;
}

export interface ListTargetsOpts {
  industry?: string;
  status?: TargetStatus;
  location?: string;
}

export interface CreateDealInput {
  targetId: string;
  name: string;
  type: DealType;
  status?: DealStatus;
  dealValue?: number;
  structure?: string;
  expectedCloseDate?: string;
  lead?: string;
  team?: string[];
}

export interface UpdateDealInput {
  name?: string;
  type?: DealType;
  status?: DealStatus;
  dealValue?: number;
  structure?: string;
  expectedCloseDate?: string;
  lead?: string;
  team?: string[];
}

export interface ListDealsOpts {
  status?: DealStatus;
  type?: DealType;
  targetId?: string;
}

export interface CreateDueDiligenceInput {
  dealId: string;
  areas: Array<{ area: DDArea; status: DDItemStatus; findings?: string; riskLevel?: RiskLevel; owner?: string }>;
  status?: DDStatus;
  startDate?: string;
  endDate?: string;
}

export interface UpdateDueDiligenceInput {
  areas?: Array<{ area: DDArea; status: DDItemStatus; findings?: string; riskLevel?: RiskLevel; owner?: string }>;
  status?: DDStatus;
  startDate?: string;
  endDate?: string;
}

export interface ListDueDiligenceOpts {
  dealId?: string;
  status?: DDStatus;
}

export interface CreateIntegrationInput {
  dealId: string;
  name: string;
  workstreams: Array<{ name: string; owner?: string; status?: WorkstreamStatus; startDate?: string; endDate?: string; milestones?: Array<{ name: string; date?: string; completed?: boolean }> }>;
  timeline?: string;
  budget?: number;
  status?: IntegrationStatus;
  synergies?: Array<{ type: SynergyType; description: string; estimatedValue?: number; realizedValue?: number }>;
  risks?: string[];
}

export interface UpdateIntegrationInput {
  name?: string;
  workstreams?: Array<{ name: string; owner?: string; status?: WorkstreamStatus; startDate?: string; endDate?: string; milestones?: Array<{ name: string; date?: string; completed?: boolean }> }>;
  timeline?: string;
  budget?: number;
  status?: IntegrationStatus;
  synergies?: Array<{ type: SynergyType; description: string; estimatedValue?: number; realizedValue?: number }>;
  risks?: string[];
}

export interface ListIntegrationsOpts {
  dealId?: string;
  status?: IntegrationStatus;
}

export interface CreateValuationInput {
  targetId: string;
  method: ValuationMethod;
  value: number;
  rangeLow?: number;
  rangeHigh?: number;
  assumptions?: string;
  multiples?: string;
  date?: string;
  analyst?: string;
}

export interface UpdateValuationInput {
  method?: ValuationMethod;
  value?: number;
  rangeLow?: number;
  rangeHigh?: number;
  assumptions?: string;
  multiples?: string;
  date?: string;
  analyst?: string;
}

export interface ListValuationsOpts {
  targetId?: string;
  method?: ValuationMethod;
}

// ── Helpers ──

const fallbackTarget: TargetContent = {
  name: '', industry: '', location: '', revenue: null, employees: null, description: '', website: '',
  ownershipType: 'private', strategicFit: '', status: 'identified', contactName: '', contactEmail: '',
};

const fallbackDeal: DealContent = {
  targetId: '', name: '', type: 'acquisition', status: 'pipeline', dealValue: null, structure: '',
  expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null,
  advancedBy: null, advancedAt: null,
};

const fallbackDD: DueDiligenceContent = {
  dealId: '', areas: [], status: 'in_progress', startDate: '', endDate: null, summary: '',
  completedBy: null, completedAt: null,
};

const fallbackIntegration: IntegrationContent = {
  dealId: '', name: '', workstreams: [], timeline: '', budget: null, status: 'planning',
  synergies: [], risks: [], summary: '', completedBy: null, completedAt: null,
};

const fallbackValuation: ValuationContent = {
  targetId: '', method: 'dcf', value: 0, rangeLow: null, rangeHigh: null, assumptions: '',
  multiples: '', date: '', analyst: '',
};

function parseTarget(raw: string): TargetContent {
  if (!raw) return fallbackTarget;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      industry: p.industry ?? '',
      location: p.location ?? '',
      revenue: p.revenue ?? null,
      employees: p.employees ?? null,
      description: p.description ?? '',
      website: p.website ?? '',
      ownershipType: (p.ownershipType as OwnershipType) ?? 'private',
      strategicFit: p.strategicFit ?? '',
      status: (p.status as TargetStatus) ?? 'identified',
      contactName: p.contactName ?? '',
      contactEmail: p.contactEmail ?? '',
    };
  } catch { return fallbackTarget; }
}

function parseDeal(raw: string): DealContent {
  if (!raw) return fallbackDeal;
  try {
    const p = JSON.parse(raw);
    return {
      targetId: p.targetId ?? '',
      name: p.name ?? '',
      type: (p.type as DealType) ?? 'acquisition',
      status: (p.status as DealStatus) ?? 'pipeline',
      dealValue: p.dealValue ?? null,
      structure: p.structure ?? '',
      expectedCloseDate: p.expectedCloseDate ?? null,
      lead: p.lead ?? '',
      team: Array.isArray(p.team) ? p.team : [],
      terminatedReason: p.terminatedReason ?? null,
      terminatedBy: p.terminatedBy ?? null,
      terminatedAt: p.terminatedAt ?? null,
      advancedBy: p.advancedBy ?? null,
      advancedAt: p.advancedAt ?? null,
    };
  } catch { return fallbackDeal; }
}

function parseDD(raw: string): DueDiligenceContent {
  if (!raw) return fallbackDD;
  try {
    const p = JSON.parse(raw);
    return {
      dealId: p.dealId ?? '',
      areas: Array.isArray(p.areas) ? p.areas.map((a: Record<string, unknown>) => ({
        area: (a.area as DDArea) ?? 'financial',
        status: (a.status as DDItemStatus) ?? 'pending',
        findings: (a.findings as string) ?? '',
        riskLevel: (a.riskLevel as RiskLevel) ?? 'medium',
        owner: (a.owner as string) ?? '',
      })) : [],
      status: (p.status as DDStatus) ?? 'in_progress',
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? null,
      summary: p.summary ?? '',
      completedBy: p.completedBy ?? null,
      completedAt: p.completedAt ?? null,
    };
  } catch { return fallbackDD; }
}

function parseIntegration(raw: string): IntegrationContent {
  if (!raw) return fallbackIntegration;
  try {
    const p = JSON.parse(raw);
    return {
      dealId: p.dealId ?? '',
      name: p.name ?? '',
      workstreams: Array.isArray(p.workstreams) ? p.workstreams.map((w: Record<string, unknown>) => ({
        name: (w.name as string) ?? '',
        owner: (w.owner as string) ?? '',
        status: (w.status as WorkstreamStatus) ?? 'not_started',
        startDate: (w.startDate as string) ?? null,
        endDate: (w.endDate as string) ?? null,
        milestones: Array.isArray(w.milestones) ? w.milestones.map((m: Record<string, unknown>) => ({
          name: (m.name as string) ?? '',
          date: (m.date as string) ?? null,
          completed: (m.completed as boolean) ?? false,
        })) : [],
      })) : [],
      timeline: p.timeline ?? '',
      budget: p.budget ?? null,
      status: (p.status as IntegrationStatus) ?? 'planning',
      synergies: Array.isArray(p.synergies) ? p.synergies.map((s: Record<string, unknown>) => ({
        type: (s.type as SynergyType) ?? 'cost',
        description: (s.description as string) ?? '',
        estimatedValue: (s.estimatedValue as number) ?? null,
        realizedValue: (s.realizedValue as number) ?? null,
      })) : [],
      risks: Array.isArray(p.risks) ? p.risks : [],
      summary: p.summary ?? '',
      completedBy: p.completedBy ?? null,
      completedAt: p.completedAt ?? null,
    };
  } catch { return fallbackIntegration; }
}

function parseValuation(raw: string): ValuationContent {
  if (!raw) return fallbackValuation;
  try {
    const p = JSON.parse(raw);
    return {
      targetId: p.targetId ?? '',
      method: (p.method as ValuationMethod) ?? 'dcf',
      value: p.value ?? 0,
      rangeLow: p.rangeLow ?? null,
      rangeHigh: p.rangeHigh ?? null,
      assumptions: p.assumptions ?? '',
      multiples: p.multiples ?? '',
      date: p.date ?? '',
      analyst: p.analyst ?? '',
    };
  } catch { return fallbackValuation; }
}

function toTarget(row: MemoryRow): MATarget {
  const c = parseTarget(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, industry: c.industry, location: c.location, revenue: c.revenue, employees: c.employees,
    description: c.description, website: c.website, ownershipType: c.ownershipType, strategicFit: c.strategicFit,
    status: c.status, contactName: c.contactName, contactEmail: c.contactEmail,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDeal(row: MemoryRow): MADeal {
  const c = parseDeal(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    targetId: c.targetId, name: c.name, type: c.type, status: c.status, dealValue: c.dealValue,
    structure: c.structure, expectedCloseDate: c.expectedCloseDate ? new Date(c.expectedCloseDate) : null,
    lead: c.lead, team: c.team, terminatedReason: c.terminatedReason, terminatedBy: c.terminatedBy,
    terminatedAt: c.terminatedAt ? new Date(c.terminatedAt) : null,
    advancedBy: c.advancedBy, advancedAt: c.advancedAt ? new Date(c.advancedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDD(row: MemoryRow): DueDiligence {
  const c = parseDD(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    dealId: c.dealId, areas: c.areas, status: c.status,
    startDate: c.startDate ? new Date(c.startDate) : row.createdAt,
    endDate: c.endDate ? new Date(c.endDate) : null,
    summary: c.summary, completedBy: c.completedBy,
    completedAt: c.completedAt ? new Date(c.completedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toIntegration(row: MemoryRow): Integration {
  const c = parseIntegration(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    dealId: c.dealId, name: c.name,
    workstreams: c.workstreams.map((w) => ({
      name: w.name, owner: w.owner, status: w.status,
      startDate: w.startDate ? new Date(w.startDate) : null,
      endDate: w.endDate ? new Date(w.endDate) : null,
      milestones: w.milestones.map((m) => ({
        name: m.name, date: m.date ? new Date(m.date) : null, completed: m.completed,
      })),
    })),
    timeline: c.timeline, budget: c.budget, status: c.status,
    synergies: c.synergies, risks: c.risks, summary: c.summary,
    completedBy: c.completedBy, completedAt: c.completedAt ? new Date(c.completedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toValuation(row: MemoryRow): Valuation {
  const c = parseValuation(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    targetId: c.targetId, method: c.method, value: c.value, rangeLow: c.rangeLow, rangeHigh: c.rangeHigh,
    assumptions: c.assumptions, multiples: c.multiples,
    date: c.date ? new Date(c.date) : row.createdAt, analyst: c.analyst,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── M&A Service ──

export const MAService = {
  // ── Targets ──

  async createTarget(
    organizationId: string,
    workspaceId: string,
    input: CreateTargetInput,
    createdBy: string,
  ): Promise<MATarget> {
    const content: TargetContent = {
      name: input.name.trim(),
      industry: input.industry.trim(),
      location: input.location ?? '',
      revenue: input.revenue ?? null,
      employees: input.employees ?? null,
      description: input.description ?? '',
      website: input.website ?? '',
      ownershipType: input.ownershipType ?? 'private',
      strategicFit: input.strategicFit ?? '',
      status: input.status ?? 'identified',
      contactName: input.contactName ?? '',
      contactEmail: input.contactEmail ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ma_target',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ma_target', content.industry, content.status]),
        createdBy,
      },
    });

    return toTarget(row as MemoryRow);
  },

  async getTarget(id: string): Promise<MATarget | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ma_target') return null;
    return toTarget(row as MemoryRow);
  },

  async listTargets(organizationId: string, opts: ListTargetsOpts = {}): Promise<MATarget[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ma_target', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toTarget(r as MemoryRow));
    if (opts.industry) records = records.filter((t) => t.industry === opts.industry);
    if (opts.status) records = records.filter((t) => t.status === opts.status);
    if (opts.location) records = records.filter((t) => t.location === opts.location);
    return records;
  },

  async updateTarget(id: string, input: UpdateTargetInput): Promise<MATarget | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTarget(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.industry !== undefined) content.industry = input.industry.trim();
    if (input.location !== undefined) content.location = input.location;
    if (input.revenue !== undefined) content.revenue = input.revenue;
    if (input.employees !== undefined) content.employees = input.employees;
    if (input.description !== undefined) content.description = input.description;
    if (input.website !== undefined) content.website = input.website;
    if (input.ownershipType !== undefined) content.ownershipType = input.ownershipType;
    if (input.strategicFit !== undefined) content.strategicFit = input.strategicFit;
    if (input.status !== undefined) content.status = input.status;
    if (input.contactName !== undefined) content.contactName = input.contactName;
    if (input.contactEmail !== undefined) content.contactEmail = input.contactEmail;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ma_target', content.industry, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toTarget(row as MemoryRow);
  },

  async deleteTarget(id: string): Promise<boolean> {
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
  ): Promise<MADeal> {
    const content: DealContent = {
      targetId: input.targetId,
      name: input.name.trim(),
      type: input.type,
      status: input.status ?? 'pipeline',
      dealValue: input.dealValue ?? null,
      structure: input.structure ?? '',
      expectedCloseDate: input.expectedCloseDate ?? null,
      lead: input.lead ?? '',
      team: input.team ?? [],
      terminatedReason: null,
      terminatedBy: null,
      terminatedAt: null,
      advancedBy: null,
      advancedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ma_deal',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.targetId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ma_deal', content.type, content.status]),
        createdBy,
      },
    });

    return toDeal(row as MemoryRow);
  },

  async getDeal(id: string): Promise<MADeal | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ma_deal') return null;
    return toDeal(row as MemoryRow);
  },

  async listDeals(organizationId: string, opts: ListDealsOpts = {}): Promise<MADeal[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ma_deal', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toDeal(r as MemoryRow));
    if (opts.status) records = records.filter((d) => d.status === opts.status);
    if (opts.type) records = records.filter((d) => d.type === opts.type);
    if (opts.targetId) records = records.filter((d) => d.targetId === opts.targetId);
    return records;
  },

  async updateDeal(id: string, input: UpdateDealInput): Promise<MADeal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDeal(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.status !== undefined) content.status = input.status;
    if (input.dealValue !== undefined) content.dealValue = input.dealValue;
    if (input.structure !== undefined) content.structure = input.structure;
    if (input.expectedCloseDate !== undefined) content.expectedCloseDate = input.expectedCloseDate;
    if (input.lead !== undefined) content.lead = input.lead;
    if (input.team !== undefined) content.team = input.team;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ma_deal', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toDeal(row as MemoryRow);
  },

  async advanceDeal(id: string, newStatus: DealStatus, advancedBy: string): Promise<MADeal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDeal(existing.content);
    content.status = newStatus;
    content.advancedBy = advancedBy;
    content.advancedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ma_deal', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toDeal(row as MemoryRow);
  },

  async terminateDeal(id: string, reason: string, terminatedBy: string): Promise<MADeal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDeal(existing.content);
    content.status = 'terminated';
    content.terminatedReason = reason;
    content.terminatedBy = terminatedBy;
    content.terminatedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ma_deal', content.type, 'terminated']),
        },
      }), null,
    );
    if (!row) return null;
    return toDeal(row as MemoryRow);
  },

  // ── Due Diligence ──

  async createDueDiligence(
    organizationId: string,
    workspaceId: string,
    input: CreateDueDiligenceInput,
    createdBy: string,
  ): Promise<DueDiligence> {
    const content: DueDiligenceContent = {
      dealId: input.dealId,
      areas: input.areas.map((a) => ({
        area: a.area,
        status: a.status,
        findings: a.findings ?? '',
        riskLevel: a.riskLevel ?? 'medium',
        owner: a.owner ?? '',
      })),
      status: input.status ?? 'in_progress',
      startDate: input.startDate ?? new Date().toISOString(),
      endDate: input.endDate ?? null,
      summary: '',
      completedBy: null,
      completedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ma_due_diligence',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.dealId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ma_due_diligence', content.status]),
        createdBy,
      },
    });

    return toDD(row as MemoryRow);
  },

  async getDueDiligence(id: string): Promise<DueDiligence | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ma_due_diligence') return null;
    return toDD(row as MemoryRow);
  },

  async listDueDiligence(organizationId: string, opts: ListDueDiligenceOpts = {}): Promise<DueDiligence[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ma_due_diligence', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toDD(r as MemoryRow));
    if (opts.dealId) records = records.filter((d) => d.dealId === opts.dealId);
    if (opts.status) records = records.filter((d) => d.status === opts.status);
    return records;
  },

  async updateDueDiligence(id: string, input: UpdateDueDiligenceInput): Promise<DueDiligence | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDD(existing.content);
    if (input.areas !== undefined) {
      content.areas = input.areas.map((a) => ({
        area: a.area,
        status: a.status,
        findings: a.findings ?? '',
        riskLevel: a.riskLevel ?? 'medium',
        owner: a.owner ?? '',
      }));
    }
    if (input.status !== undefined) content.status = input.status;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ma_due_diligence', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toDD(row as MemoryRow);
  },

  async completeDueDiligence(id: string, summary: string, completedBy: string): Promise<DueDiligence | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDD(existing.content);
    content.status = 'complete';
    content.summary = summary;
    content.completedBy = completedBy;
    content.completedAt = new Date().toISOString();
    content.endDate = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ma_due_diligence', 'complete']),
        },
      }), null,
    );
    if (!row) return null;
    return toDD(row as MemoryRow);
  },

  // ── Integrations ──

  async createIntegration(
    organizationId: string,
    workspaceId: string,
    input: CreateIntegrationInput,
    createdBy: string,
  ): Promise<Integration> {
    const content: IntegrationContent = {
      dealId: input.dealId,
      name: input.name.trim(),
      workstreams: input.workstreams.map((w) => ({
        name: w.name,
        owner: w.owner ?? '',
        status: w.status ?? 'not_started',
        startDate: w.startDate ?? null,
        endDate: w.endDate ?? null,
        milestones: (w.milestones ?? []).map((m) => ({
          name: m.name,
          date: m.date ?? null,
          completed: m.completed ?? false,
        })),
      })),
      timeline: input.timeline ?? '',
      budget: input.budget ?? null,
      status: input.status ?? 'planning',
      synergies: (input.synergies ?? []).map((s) => ({
        type: s.type,
        description: s.description,
        estimatedValue: s.estimatedValue ?? null,
        realizedValue: s.realizedValue ?? null,
      })),
      risks: input.risks ?? [],
      summary: '',
      completedBy: null,
      completedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ma_integration',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.dealId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ma_integration', content.status]),
        createdBy,
      },
    });

    return toIntegration(row as MemoryRow);
  },

  async getIntegration(id: string): Promise<Integration | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ma_integration') return null;
    return toIntegration(row as MemoryRow);
  },

  async listIntegrations(organizationId: string, opts: ListIntegrationsOpts = {}): Promise<Integration[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ma_integration', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toIntegration(r as MemoryRow));
    if (opts.dealId) records = records.filter((i) => i.dealId === opts.dealId);
    if (opts.status) records = records.filter((i) => i.status === opts.status);
    return records;
  },

  async updateIntegration(id: string, input: UpdateIntegrationInput): Promise<Integration | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIntegration(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.workstreams !== undefined) {
      content.workstreams = input.workstreams.map((w) => ({
        name: w.name,
        owner: w.owner ?? '',
        status: w.status ?? 'not_started',
        startDate: w.startDate ?? null,
        endDate: w.endDate ?? null,
        milestones: (w.milestones ?? []).map((m) => ({
          name: m.name,
          date: m.date ?? null,
          completed: m.completed ?? false,
        })),
      }));
    }
    if (input.timeline !== undefined) content.timeline = input.timeline;
    if (input.budget !== undefined) content.budget = input.budget;
    if (input.status !== undefined) content.status = input.status;
    if (input.synergies !== undefined) {
      content.synergies = input.synergies.map((s) => ({
        type: s.type,
        description: s.description,
        estimatedValue: s.estimatedValue ?? null,
        realizedValue: s.realizedValue ?? null,
      }));
    }
    if (input.risks !== undefined) content.risks = input.risks;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ma_integration', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toIntegration(row as MemoryRow);
  },

  async completeIntegration(id: string, summary: string, completedBy: string): Promise<Integration | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIntegration(existing.content);
    content.status = 'complete';
    content.summary = summary;
    content.completedBy = completedBy;
    content.completedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ma_integration', 'complete']),
        },
      }), null,
    );
    if (!row) return null;
    return toIntegration(row as MemoryRow);
  },

  // ── Valuations ──

  async createValuation(
    organizationId: string,
    workspaceId: string,
    input: CreateValuationInput,
    createdBy: string,
  ): Promise<Valuation> {
    const content: ValuationContent = {
      targetId: input.targetId,
      method: input.method,
      value: input.value,
      rangeLow: input.rangeLow ?? null,
      rangeHigh: input.rangeHigh ?? null,
      assumptions: input.assumptions ?? '',
      multiples: input.multiples ?? '',
      date: input.date ?? new Date().toISOString(),
      analyst: input.analyst ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ma_valuation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.targetId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ma_valuation', content.method]),
        createdBy,
      },
    });

    return toValuation(row as MemoryRow);
  },

  async getValuation(id: string): Promise<Valuation | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ma_valuation') return null;
    return toValuation(row as MemoryRow);
  },

  async listValuations(organizationId: string, opts: ListValuationsOpts = {}): Promise<Valuation[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ma_valuation', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toValuation(r as MemoryRow));
    if (opts.targetId) records = records.filter((v) => v.targetId === opts.targetId);
    if (opts.method) records = records.filter((v) => v.method === opts.method);
    return records;
  },

  async updateValuation(id: string, input: UpdateValuationInput): Promise<Valuation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseValuation(existing.content);
    if (input.method !== undefined) content.method = input.method;
    if (input.value !== undefined) content.value = input.value;
    if (input.rangeLow !== undefined) content.rangeLow = input.rangeLow;
    if (input.rangeHigh !== undefined) content.rangeHigh = input.rangeHigh;
    if (input.assumptions !== undefined) content.assumptions = input.assumptions;
    if (input.multiples !== undefined) content.multiples = input.multiples;
    if (input.date !== undefined) content.date = input.date;
    if (input.analyst !== undefined) content.analyst = input.analyst;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ma_valuation', content.method]),
        },
      }), null,
    );
    if (!row) return null;
    return toValuation(row as MemoryRow);
  },

  async deleteValuation(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Metrics ──

  async getMAMetrics(organizationId: string): Promise<MAMetrics> {
    const [deals, dds, integrations] = await Promise.all([
      MAService.listDeals(organizationId),
      MAService.listDueDiligence(organizationId),
      MAService.listIntegrations(organizationId),
    ]);

    const pipelineValueByStage: Record<string, number> = {};
    let activeDeals = 0;
    let totalCycleDays = 0;
    let completedCount = 0;

    for (const d of deals) {
      const val = d.dealValue ?? 0;
      if (!pipelineValueByStage[d.status]) pipelineValueByStage[d.status] = 0;
      pipelineValueByStage[d.status] += val;

      const activeStatuses: DealStatus[] = ['pipeline', 'initial_contact', 'negotiation', 'letter_of_intent', 'due_diligence', 'definitive_agreement', 'closing'];
      if (activeStatuses.includes(d.status)) activeDeals++;

      if (d.status === 'completed' && d.advancedAt) {
        const cycle = (d.updatedAt.getTime() - d.advancedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (cycle >= 0) {
          totalCycleDays += cycle;
          completedCount++;
        }
      }
    }

    const ddComplete = dds.filter((d) => d.status === 'complete').length;
    const ddCompletionRate = dds.length > 0 ? Math.round((ddComplete / dds.length) * 100) : 0;

    let synergyRealized = 0;
    for (const i of integrations) {
      for (const s of i.synergies) {
        synergyRealized += s.realizedValue ?? 0;
      }
    }

    return {
      pipelineValueByStage,
      activeDeals,
      ddCompletionRate,
      integrationSynergyRealized: synergyRealized,
      avgDealCycleDays: completedCount > 0 ? Math.round(totalCycleDays / completedCount) : 0,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<MAStats> {
    const [targets, deals, dds, integrations, valuations] = await Promise.all([
      MAService.listTargets(organizationId),
      MAService.listDeals(organizationId),
      MAService.listDueDiligence(organizationId),
      MAService.listIntegrations(organizationId),
      MAService.listValuations(organizationId),
    ]);

    const byDealStatus: Record<string, number> = {};
    const byDealType: Record<string, number> = {};
    const byTargetStatus: Record<string, number> = {};
    let activeDealCount = 0;
    let completedDealCount = 0;
    let terminatedDealCount = 0;
    let totalPipelineValue = 0;

    const activeStatuses: DealStatus[] = ['pipeline', 'initial_contact', 'negotiation', 'letter_of_intent', 'due_diligence', 'definitive_agreement', 'closing'];

    for (const d of deals) {
      byDealStatus[d.status] = (byDealStatus[d.status] || 0) + 1;
      byDealType[d.type] = (byDealType[d.type] || 0) + 1;
      if (activeStatuses.includes(d.status)) activeDealCount++;
      if (d.status === 'completed') completedDealCount++;
      if (d.status === 'terminated') terminatedDealCount++;
      totalPipelineValue += d.dealValue ?? 0;
    }

    for (const t of targets) {
      byTargetStatus[t.status] = (byTargetStatus[t.status] || 0) + 1;
    }

    return {
      targetCount: targets.length,
      dealCount: deals.length,
      activeDealCount,
      completedDealCount,
      terminatedDealCount,
      dueDiligenceCount: dds.length,
      integrationCount: integrations.length,
      valuationCount: valuations.length,
      totalPipelineValue,
      byDealStatus,
      byDealType,
      byTargetStatus,
    };
  },
};
