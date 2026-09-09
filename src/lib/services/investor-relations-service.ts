import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type InvestorType = 'angel' | 'vc' | 'pe' | 'strategic' | 'institutional' | 'individual' | 'family_office';
export type InvestorStatus = 'active' | 'inactive' | 'passed' | 'invested';
export type FundingRoundType = 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'series_c' | 'growth' | 'bridge' | 'debt' | 'convertible';
export type FundingRoundStatus = 'planned' | 'open' | 'closed' | 'cancelled';
export type StakeholderType = 'founder' | 'investor' | 'employee' | 'advisor' | 'pool';
export type ShareClass = 'common' | 'preferred_a' | 'preferred_b' | 'preferred_c' | 'options' | 'warrants' | 'convertible';
export type CommunicationType = 'email' | 'call' | 'meeting' | 'report' | 'update' | 'other';
export type CommunicationStatus = 'sent' | 'received' | 'scheduled' | 'draft' | 'cancelled';
export type UpdateStatus = 'draft' | 'scheduled' | 'published' | 'archived';

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

interface InvestorContent {
  name: string;
  type: InvestorType;
  firm: string;
  email: string;
  phone: string;
  investmentFocus: string;
  checkSize: string;
  stage: string;
  portfolioCompanies: string[];
  status: InvestorStatus;
  notes: string;
}

interface FundingRoundContent {
  name: string;
  type: FundingRoundType;
  targetAmount: number;
  raisedAmount: number;
  preMoneyValuation: number | null;
  postMoneyValuation: number | null;
  dilution: number | null;
  leadInvestor: string;
  participants: Array<{ investorId: string; amount: number }>;
  status: FundingRoundStatus;
  startDate: string | null;
  closeDate: string | null;
  terms: string;
  notes: string;
}

interface CapTableEntryContent {
  stakeholderName: string;
  stakeholderType: StakeholderType;
  shares: number;
  shareClass: ShareClass;
  pricePerShare: number | null;
  ownershipPercent: number | null;
  vestingSchedule: string;
  grantDate: string | null;
  notes: string;
}

interface CommunicationContent {
  investorId: string;
  type: CommunicationType;
  subject: string;
  date: string;
  summary: string;
  outcome: string;
  followUp: string;
  status: CommunicationStatus;
}

interface UpdateContent {
  title: string;
  period: string;
  content: string;
  metrics: Array<{ name: string; value: string; unit: string; trend: string | null }>;
  highlights: string[];
  challenges: string[];
  financials: string;
  status: UpdateStatus;
  sentTo: string[];
  date: string;
  publishedBy: string | null;
  publishedAt: string | null;
}

// ── Public interfaces ──

export interface Investor {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: InvestorType;
  firm: string;
  email: string;
  phone: string;
  investmentFocus: string;
  checkSize: string;
  stage: string;
  portfolioCompanies: string[];
  status: InvestorStatus;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FundingRound {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: FundingRoundType;
  targetAmount: number;
  raisedAmount: number;
  preMoneyValuation: number | null;
  postMoneyValuation: number | null;
  dilution: number | null;
  leadInvestor: string;
  participants: Array<{ investorId: string; amount: number }>;
  status: FundingRoundStatus;
  startDate: Date | null;
  closeDate: Date | null;
  terms: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CapTableEntry {
  id: string;
  organizationId: string;
  workspaceId: string;
  stakeholderName: string;
  stakeholderType: StakeholderType;
  shares: number;
  shareClass: ShareClass;
  pricePerShare: number | null;
  ownershipPercent: number | null;
  vestingSchedule: string;
  grantDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Communication {
  id: string;
  organizationId: string;
  workspaceId: string;
  investorId: string;
  type: CommunicationType;
  subject: string;
  date: Date;
  summary: string;
  outcome: string;
  followUp: string;
  status: CommunicationStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRUpdate {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  period: string;
  content: string;
  metrics: Array<{ name: string; value: string; unit: string; trend: string | null }>;
  highlights: string[];
  challenges: string[];
  financials: string;
  status: UpdateStatus;
  sentTo: string[];
  date: Date;
  publishedBy: string | null;
  publishedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CapTableSummary {
  totalShares: number;
  byStakeholderType: Record<string, number>;
  byShareClass: Record<string, number>;
  entries: number;
}

export interface IRMetrics {
  totalRaised: number;
  capTableSummary: CapTableSummary;
  investorCountByType: Record<string, number>;
  fundingProgress: Array<{ id: string; name: string; type: FundingRoundType; targetAmount: number; raisedAmount: number; progress: number; status: FundingRoundStatus }>;
  lastUpdateDate: Date | null;
}

export interface IRStats {
  investorCount: number;
  fundingRoundCount: number;
  capTableEntryCount: number;
  communicationCount: number;
  updateCount: number;
  totalRaised: number;
  totalTarget: number;
  activeInvestorCount: number;
  byInvestorType: Record<string, number>;
  byFundingRoundStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateInvestorInput {
  name: string;
  type: InvestorType;
  firm?: string;
  email?: string;
  phone?: string;
  investmentFocus?: string;
  checkSize?: string;
  stage?: string;
  portfolioCompanies?: string[];
  status?: InvestorStatus;
  notes?: string;
}

export interface UpdateInvestorInput {
  name?: string;
  type?: InvestorType;
  firm?: string;
  email?: string;
  phone?: string;
  investmentFocus?: string;
  checkSize?: string;
  stage?: string;
  portfolioCompanies?: string[];
  status?: InvestorStatus;
  notes?: string;
}

export interface ListInvestorsOpts {
  type?: InvestorType;
  status?: InvestorStatus;
  stage?: string;
}

export interface CreateFundingRoundInput {
  name: string;
  type: FundingRoundType;
  targetAmount: number;
  raisedAmount?: number;
  preMoneyValuation?: number;
  postMoneyValuation?: number;
  dilution?: number;
  leadInvestor?: string;
  participants?: Array<{ investorId: string; amount: number }>;
  status?: FundingRoundStatus;
  startDate?: string;
  closeDate?: string;
  terms?: string;
  notes?: string;
}

export interface UpdateFundingRoundInput {
  name?: string;
  type?: FundingRoundType;
  targetAmount?: number;
  raisedAmount?: number;
  preMoneyValuation?: number;
  postMoneyValuation?: number;
  dilution?: number;
  leadInvestor?: string;
  participants?: Array<{ investorId: string; amount: number }>;
  status?: FundingRoundStatus;
  startDate?: string;
  closeDate?: string;
  terms?: string;
  notes?: string;
}

export interface ListFundingRoundsOpts {
  type?: FundingRoundType;
  status?: FundingRoundStatus;
}

export interface CreateCapTableEntryInput {
  stakeholderName: string;
  stakeholderType: StakeholderType;
  shares: number;
  shareClass: ShareClass;
  pricePerShare?: number;
  ownershipPercent?: number;
  vestingSchedule?: string;
  grantDate?: string;
  notes?: string;
}

export interface UpdateCapTableEntryInput {
  stakeholderName?: string;
  stakeholderType?: StakeholderType;
  shares?: number;
  shareClass?: ShareClass;
  pricePerShare?: number;
  ownershipPercent?: number;
  vestingSchedule?: string;
  grantDate?: string;
  notes?: string;
}

export interface ListCapTableOpts {
  stakeholderType?: StakeholderType;
  shareClass?: ShareClass;
}

export interface CreateCommunicationInput {
  investorId: string;
  type: CommunicationType;
  subject: string;
  date: string;
  summary?: string;
  outcome?: string;
  followUp?: string;
  status?: CommunicationStatus;
}

export interface UpdateCommunicationInput {
  type?: CommunicationType;
  subject?: string;
  date?: string;
  summary?: string;
  outcome?: string;
  followUp?: string;
  status?: CommunicationStatus;
}

export interface ListCommunicationsOpts {
  investorId?: string;
  type?: CommunicationType;
  status?: CommunicationStatus;
}

export interface CreateUpdateInput {
  title: string;
  period: string;
  content: string;
  metrics?: Array<{ name: string; value: string; unit: string; trend?: string }>;
  highlights?: string[];
  challenges?: string[];
  financials?: string;
  status?: UpdateStatus;
  sentTo?: string[];
  date?: string;
}

export interface UpdateUpdateInput {
  title?: string;
  period?: string;
  content?: string;
  metrics?: Array<{ name: string; value: string; unit: string; trend?: string }>;
  highlights?: string[];
  challenges?: string[];
  financials?: string;
  status?: UpdateStatus;
  sentTo?: string[];
  date?: string;
}

export interface ListUpdatesOpts {
  status?: UpdateStatus;
  period?: string;
}

// ── Helpers ──

const fallbackInvestor: InvestorContent = {
  name: '', type: 'individual', firm: '', email: '', phone: '', investmentFocus: '', checkSize: '', stage: '', portfolioCompanies: [], status: 'active', notes: '',
};

const fallbackFundingRound: FundingRoundContent = {
  name: '', type: 'seed', targetAmount: 0, raisedAmount: 0, preMoneyValuation: null, postMoneyValuation: null, dilution: null, leadInvestor: '', participants: [], status: 'planned', startDate: null, closeDate: null, terms: '', notes: '',
};

const fallbackCapEntry: CapTableEntryContent = {
  stakeholderName: '', stakeholderType: 'founder', shares: 0, shareClass: 'common', pricePerShare: null, ownershipPercent: null, vestingSchedule: '', grantDate: null, notes: '',
};

const fallbackCommunication: CommunicationContent = {
  investorId: '', type: 'email', subject: '', date: '', summary: '', outcome: '', followUp: '', status: 'sent',
};

const fallbackUpdate: UpdateContent = {
  title: '', period: '', content: '', metrics: [], highlights: [], challenges: [], financials: '', status: 'draft', sentTo: [], date: '', publishedBy: null, publishedAt: null,
};

function parseInvestor(raw: string): InvestorContent {
  if (!raw) return fallbackInvestor;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      type: (p.type as InvestorType) ?? 'individual',
      firm: p.firm ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      investmentFocus: p.investmentFocus ?? '',
      checkSize: p.checkSize ?? '',
      stage: p.stage ?? '',
      portfolioCompanies: Array.isArray(p.portfolioCompanies) ? p.portfolioCompanies : [],
      status: (p.status as InvestorStatus) ?? 'active',
      notes: p.notes ?? '',
    };
  } catch { return fallbackInvestor; }
}

function parseFundingRound(raw: string): FundingRoundContent {
  if (!raw) return fallbackFundingRound;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      type: (p.type as FundingRoundType) ?? 'seed',
      targetAmount: p.targetAmount ?? 0,
      raisedAmount: p.raisedAmount ?? 0,
      preMoneyValuation: p.preMoneyValuation ?? null,
      postMoneyValuation: p.postMoneyValuation ?? null,
      dilution: p.dilution ?? null,
      leadInvestor: p.leadInvestor ?? '',
      participants: Array.isArray(p.participants) ? p.participants : [],
      status: (p.status as FundingRoundStatus) ?? 'planned',
      startDate: p.startDate ?? null,
      closeDate: p.closeDate ?? null,
      terms: p.terms ?? '',
      notes: p.notes ?? '',
    };
  } catch { return fallbackFundingRound; }
}

function parseCapEntry(raw: string): CapTableEntryContent {
  if (!raw) return fallbackCapEntry;
  try {
    const p = JSON.parse(raw);
    return {
      stakeholderName: p.stakeholderName ?? '',
      stakeholderType: (p.stakeholderType as StakeholderType) ?? 'founder',
      shares: p.shares ?? 0,
      shareClass: (p.shareClass as ShareClass) ?? 'common',
      pricePerShare: p.pricePerShare ?? null,
      ownershipPercent: p.ownershipPercent ?? null,
      vestingSchedule: p.vestingSchedule ?? '',
      grantDate: p.grantDate ?? null,
      notes: p.notes ?? '',
    };
  } catch { return fallbackCapEntry; }
}

function parseCommunication(raw: string): CommunicationContent {
  if (!raw) return fallbackCommunication;
  try {
    const p = JSON.parse(raw);
    return {
      investorId: p.investorId ?? '',
      type: (p.type as CommunicationType) ?? 'email',
      subject: p.subject ?? '',
      date: p.date ?? '',
      summary: p.summary ?? '',
      outcome: p.outcome ?? '',
      followUp: p.followUp ?? '',
      status: (p.status as CommunicationStatus) ?? 'sent',
    };
  } catch { return fallbackCommunication; }
}

function parseUpdate(raw: string): UpdateContent {
  if (!raw) return fallbackUpdate;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      period: p.period ?? '',
      content: p.content ?? '',
      metrics: Array.isArray(p.metrics) ? p.metrics : [],
      highlights: Array.isArray(p.highlights) ? p.highlights : [],
      challenges: Array.isArray(p.challenges) ? p.challenges : [],
      financials: p.financials ?? '',
      status: (p.status as UpdateStatus) ?? 'draft',
      sentTo: Array.isArray(p.sentTo) ? p.sentTo : [],
      date: p.date ?? '',
      publishedBy: p.publishedBy ?? null,
      publishedAt: p.publishedAt ?? null,
    };
  } catch { return fallbackUpdate; }
}

function toInvestor(row: MemoryRow): Investor {
  const c = parseInvestor(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, type: c.type, firm: c.firm, email: c.email, phone: c.phone,
    investmentFocus: c.investmentFocus, checkSize: c.checkSize, stage: c.stage,
    portfolioCompanies: c.portfolioCompanies, status: c.status, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toFundingRound(row: MemoryRow): FundingRound {
  const c = parseFundingRound(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, type: c.type, targetAmount: c.targetAmount, raisedAmount: c.raisedAmount,
    preMoneyValuation: c.preMoneyValuation, postMoneyValuation: c.postMoneyValuation,
    dilution: c.dilution, leadInvestor: c.leadInvestor, participants: c.participants,
    status: c.status, startDate: c.startDate ? new Date(c.startDate) : null,
    closeDate: c.closeDate ? new Date(c.closeDate) : null, terms: c.terms, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCapEntry(row: MemoryRow): CapTableEntry {
  const c = parseCapEntry(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    stakeholderName: c.stakeholderName, stakeholderType: c.stakeholderType,
    shares: c.shares, shareClass: c.shareClass, pricePerShare: c.pricePerShare,
    ownershipPercent: c.ownershipPercent, vestingSchedule: c.vestingSchedule,
    grantDate: c.grantDate ? new Date(c.grantDate) : null, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCommunication(row: MemoryRow): Communication {
  const c = parseCommunication(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    investorId: c.investorId, type: c.type, subject: c.subject,
    date: c.date ? new Date(c.date) : row.createdAt, summary: c.summary, outcome: c.outcome,
    followUp: c.followUp, status: c.status,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toUpdate(row: MemoryRow): IRUpdate {
  const c = parseUpdate(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, period: c.period, content: c.content, metrics: c.metrics,
    highlights: c.highlights, challenges: c.challenges, financials: c.financials,
    status: c.status, sentTo: c.sentTo, date: c.date ? new Date(c.date) : row.createdAt,
    publishedBy: c.publishedBy, publishedAt: c.publishedAt ? new Date(c.publishedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Investor Relations Service ──

export const InvestorRelationsService = {
  // ── Investors ──

  async createInvestor(
    organizationId: string,
    workspaceId: string,
    input: CreateInvestorInput,
    createdBy: string,
  ): Promise<Investor> {
    const content: InvestorContent = {
      name: input.name.trim(),
      type: input.type,
      firm: input.firm ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      investmentFocus: input.investmentFocus ?? '',
      checkSize: input.checkSize ?? '',
      stage: input.stage ?? '',
      portfolioCompanies: input.portfolioCompanies ?? [],
      status: input.status ?? 'active',
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ir_investor',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ir_investor', content.type, content.status]),
        createdBy,
      },
    });

    return toInvestor(row as MemoryRow);
  },

  async getInvestor(id: string): Promise<Investor | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ir_investor') return null;
    return toInvestor(row as MemoryRow);
  },

  async listInvestors(organizationId: string, opts: ListInvestorsOpts = {}): Promise<Investor[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ir_investor', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toInvestor(r as MemoryRow));
    if (opts.type) records = records.filter((i) => i.type === opts.type);
    if (opts.status) records = records.filter((i) => i.status === opts.status);
    if (opts.stage) records = records.filter((i) => i.stage === opts.stage);
    return records;
  },

  async updateInvestor(id: string, input: UpdateInvestorInput): Promise<Investor | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseInvestor(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.firm !== undefined) content.firm = input.firm;
    if (input.email !== undefined) content.email = input.email;
    if (input.phone !== undefined) content.phone = input.phone;
    if (input.investmentFocus !== undefined) content.investmentFocus = input.investmentFocus;
    if (input.checkSize !== undefined) content.checkSize = input.checkSize;
    if (input.stage !== undefined) content.stage = input.stage;
    if (input.portfolioCompanies !== undefined) content.portfolioCompanies = input.portfolioCompanies;
    if (input.status !== undefined) content.status = input.status;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ir_investor', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toInvestor(row as MemoryRow);
  },

  async deleteInvestor(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Funding Rounds ──

  async createFundingRound(
    organizationId: string,
    workspaceId: string,
    input: CreateFundingRoundInput,
    createdBy: string,
  ): Promise<FundingRound> {
    const content: FundingRoundContent = {
      name: input.name.trim(),
      type: input.type,
      targetAmount: input.targetAmount,
      raisedAmount: input.raisedAmount ?? 0,
      preMoneyValuation: input.preMoneyValuation ?? null,
      postMoneyValuation: input.postMoneyValuation ?? null,
      dilution: input.dilution ?? null,
      leadInvestor: input.leadInvestor ?? '',
      participants: input.participants ?? [],
      status: input.status ?? 'planned',
      startDate: input.startDate ?? null,
      closeDate: input.closeDate ?? null,
      terms: input.terms ?? '',
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ir_funding_round',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ir_funding_round', content.type, content.status]),
        createdBy,
      },
    });

    return toFundingRound(row as MemoryRow);
  },

  async getFundingRound(id: string): Promise<FundingRound | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ir_funding_round') return null;
    return toFundingRound(row as MemoryRow);
  },

  async listFundingRounds(organizationId: string, opts: ListFundingRoundsOpts = {}): Promise<FundingRound[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ir_funding_round', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toFundingRound(r as MemoryRow));
    if (opts.type) records = records.filter((r) => r.type === opts.type);
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    return records;
  },

  async updateFundingRound(id: string, input: UpdateFundingRoundInput): Promise<FundingRound | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFundingRound(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.targetAmount !== undefined) content.targetAmount = input.targetAmount;
    if (input.raisedAmount !== undefined) content.raisedAmount = input.raisedAmount;
    if (input.preMoneyValuation !== undefined) content.preMoneyValuation = input.preMoneyValuation;
    if (input.postMoneyValuation !== undefined) content.postMoneyValuation = input.postMoneyValuation;
    if (input.dilution !== undefined) content.dilution = input.dilution;
    if (input.leadInvestor !== undefined) content.leadInvestor = input.leadInvestor;
    if (input.participants !== undefined) content.participants = input.participants;
    if (input.status !== undefined) content.status = input.status;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.closeDate !== undefined) content.closeDate = input.closeDate;
    if (input.terms !== undefined) content.terms = input.terms;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ir_funding_round', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toFundingRound(row as MemoryRow);
  },

  async closeFundingRound(id: string, finalAmount: number, closedBy: string): Promise<FundingRound | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseFundingRound(existing.content);
    content.raisedAmount = finalAmount;
    content.status = 'closed';
    content.closeDate = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ir_funding_round', content.type, 'closed']),
        },
      }), null,
    );
    if (!row) return null;
    return toFundingRound(row as MemoryRow);
  },

  // ── Cap Table ──

  async createCapTableEntry(
    organizationId: string,
    workspaceId: string,
    input: CreateCapTableEntryInput,
    createdBy: string,
  ): Promise<CapTableEntry> {
    const content: CapTableEntryContent = {
      stakeholderName: input.stakeholderName.trim(),
      stakeholderType: input.stakeholderType,
      shares: input.shares,
      shareClass: input.shareClass,
      pricePerShare: input.pricePerShare ?? null,
      ownershipPercent: input.ownershipPercent ?? null,
      vestingSchedule: input.vestingSchedule ?? '',
      grantDate: input.grantDate ?? null,
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ir_cap_table_entry',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ir_cap_table_entry', content.stakeholderType, content.shareClass]),
        createdBy,
      },
    });

    return toCapEntry(row as MemoryRow);
  },

  async getCapTableEntry(id: string): Promise<CapTableEntry | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ir_cap_table_entry') return null;
    return toCapEntry(row as MemoryRow);
  },

  async listCapTable(organizationId: string, opts: ListCapTableOpts = {}): Promise<CapTableEntry[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ir_cap_table_entry', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toCapEntry(r as MemoryRow));
    if (opts.stakeholderType) records = records.filter((e) => e.stakeholderType === opts.stakeholderType);
    if (opts.shareClass) records = records.filter((e) => e.shareClass === opts.shareClass);
    return records;
  },

  async updateCapTableEntry(id: string, input: UpdateCapTableEntryInput): Promise<CapTableEntry | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCapEntry(existing.content);
    if (input.stakeholderName !== undefined) content.stakeholderName = input.stakeholderName.trim();
    if (input.stakeholderType !== undefined) content.stakeholderType = input.stakeholderType;
    if (input.shares !== undefined) content.shares = input.shares;
    if (input.shareClass !== undefined) content.shareClass = input.shareClass;
    if (input.pricePerShare !== undefined) content.pricePerShare = input.pricePerShare;
    if (input.ownershipPercent !== undefined) content.ownershipPercent = input.ownershipPercent;
    if (input.vestingSchedule !== undefined) content.vestingSchedule = input.vestingSchedule;
    if (input.grantDate !== undefined) content.grantDate = input.grantDate;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ir_cap_table_entry', content.stakeholderType, content.shareClass]),
        },
      }), null,
    );
    if (!row) return null;
    return toCapEntry(row as MemoryRow);
  },

  async deleteCapTableEntry(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async getCapTableSummary(organizationId: string): Promise<CapTableSummary> {
    const entries = await InvestorRelationsService.listCapTable(organizationId);
    let totalShares = 0;
    const byStakeholderType: Record<string, number> = {};
    const byShareClass: Record<string, number> = {};

    for (const e of entries) {
      totalShares += e.shares;
      byStakeholderType[e.stakeholderType] = (byStakeholderType[e.stakeholderType] || 0) + e.shares;
      byShareClass[e.shareClass] = (byShareClass[e.shareClass] || 0) + e.shares;
    }

    return { totalShares, byStakeholderType, byShareClass, entries: entries.length };
  },

  // ── Communications ──

  async createCommunication(
    organizationId: string,
    workspaceId: string,
    input: CreateCommunicationInput,
    createdBy: string,
  ): Promise<Communication> {
    const content: CommunicationContent = {
      investorId: input.investorId,
      type: input.type,
      subject: input.subject.trim(),
      date: input.date,
      summary: input.summary ?? '',
      outcome: input.outcome ?? '',
      followUp: input.followUp ?? '',
      status: input.status ?? 'sent',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ir_communication',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.investorId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ir_communication', content.type, content.status]),
        createdBy,
      },
    });

    return toCommunication(row as MemoryRow);
  },

  async getCommunication(id: string): Promise<Communication | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ir_communication') return null;
    return toCommunication(row as MemoryRow);
  },

  async listCommunications(organizationId: string, opts: ListCommunicationsOpts = {}): Promise<Communication[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ir_communication', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toCommunication(r as MemoryRow));
    if (opts.investorId) records = records.filter((c) => c.investorId === opts.investorId);
    if (opts.type) records = records.filter((c) => c.type === opts.type);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    return records;
  },

  async updateCommunication(id: string, input: UpdateCommunicationInput): Promise<Communication | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCommunication(existing.content);
    if (input.type !== undefined) content.type = input.type;
    if (input.subject !== undefined) content.subject = input.subject.trim();
    if (input.date !== undefined) content.date = input.date;
    if (input.summary !== undefined) content.summary = input.summary;
    if (input.outcome !== undefined) content.outcome = input.outcome;
    if (input.followUp !== undefined) content.followUp = input.followUp;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ir_communication', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toCommunication(row as MemoryRow);
  },

  // ── Updates ──

  async createUpdate(
    organizationId: string,
    workspaceId: string,
    input: CreateUpdateInput,
    createdBy: string,
  ): Promise<IRUpdate> {
    const content: UpdateContent = {
      title: input.title.trim(),
      period: input.period,
      content: input.content,
      metrics: (input.metrics ?? []).map((m) => ({ name: m.name, value: m.value, unit: m.unit, trend: m.trend ?? null })),
      highlights: input.highlights ?? [],
      challenges: input.challenges ?? [],
      financials: input.financials ?? '',
      status: input.status ?? 'draft',
      sentTo: input.sentTo ?? [],
      date: input.date ?? new Date().toISOString(),
      publishedBy: null,
      publishedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'ir_update',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ir_update', content.status]),
        createdBy,
      },
    });

    return toUpdate(row as MemoryRow);
  },

  async getUpdate(id: string): Promise<IRUpdate | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ir_update') return null;
    return toUpdate(row as MemoryRow);
  },

  async listUpdates(organizationId: string, opts: ListUpdatesOpts = {}): Promise<IRUpdate[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'ir_update', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toUpdate(r as MemoryRow));
    if (opts.status) records = records.filter((u) => u.status === opts.status);
    if (opts.period) records = records.filter((u) => u.period === opts.period);
    return records;
  },

  async updateUpdate(id: string, input: UpdateUpdateInput): Promise<IRUpdate | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseUpdate(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.period !== undefined) content.period = input.period;
    if (input.content !== undefined) content.content = input.content;
    if (input.metrics !== undefined) content.metrics = input.metrics.map((m) => ({ name: m.name, value: m.value, unit: m.unit, trend: m.trend ?? null }));
    if (input.highlights !== undefined) content.highlights = input.highlights;
    if (input.challenges !== undefined) content.challenges = input.challenges;
    if (input.financials !== undefined) content.financials = input.financials;
    if (input.status !== undefined) content.status = input.status;
    if (input.sentTo !== undefined) content.sentTo = input.sentTo;
    if (input.date !== undefined) content.date = input.date;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ir_update', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toUpdate(row as MemoryRow);
  },

  async publishUpdate(id: string, publishedBy: string): Promise<IRUpdate | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseUpdate(existing.content);
    content.status = 'published';
    content.publishedBy = publishedBy;
    content.publishedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['ir_update', 'published']),
        },
      }), null,
    );
    if (!row) return null;
    return toUpdate(row as MemoryRow);
  },

  // ── Metrics ──

  async getIRMetrics(organizationId: string): Promise<IRMetrics> {
    const [investors, rounds, capSummary, updates] = await Promise.all([
      InvestorRelationsService.listInvestors(organizationId),
      InvestorRelationsService.listFundingRounds(organizationId),
      InvestorRelationsService.getCapTableSummary(organizationId),
      InvestorRelationsService.listUpdates(organizationId),
    ]);

    let totalRaised = 0;
    for (const r of rounds) {
      if (r.status === 'closed') totalRaised += r.raisedAmount;
    }

    const investorCountByType: Record<string, number> = {};
    for (const inv of investors) {
      investorCountByType[inv.type] = (investorCountByType[inv.type] || 0) + 1;
    }

    const fundingProgress = rounds.map((r) => ({
      id: r.id, name: r.name, type: r.type, targetAmount: r.targetAmount,
      raisedAmount: r.raisedAmount,
      progress: r.targetAmount > 0 ? Math.round((r.raisedAmount / r.targetAmount) * 100) : 0,
      status: r.status,
    }));

    const publishedUpdates = updates.filter((u) => u.status === 'published');
    const lastUpdateDate = publishedUpdates.length > 0
      ? publishedUpdates.reduce((latest, u) => (u.date > latest ? u.date : latest), publishedUpdates[0].date)
      : null;

    return {
      totalRaised,
      capTableSummary: capSummary,
      investorCountByType,
      fundingProgress,
      lastUpdateDate,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<IRStats> {
    const [investors, rounds, capEntries, communications, updates] = await Promise.all([
      InvestorRelationsService.listInvestors(organizationId),
      InvestorRelationsService.listFundingRounds(organizationId),
      InvestorRelationsService.listCapTable(organizationId),
      InvestorRelationsService.listCommunications(organizationId),
      InvestorRelationsService.listUpdates(organizationId),
    ]);

    let totalRaised = 0;
    let totalTarget = 0;
    let activeInvestorCount = 0;
    const byInvestorType: Record<string, number> = {};
    const byFundingRoundStatus: Record<string, number> = {};

    for (const inv of investors) {
      byInvestorType[inv.type] = (byInvestorType[inv.type] || 0) + 1;
      if (inv.status === 'active' || inv.status === 'invested') activeInvestorCount++;
    }

    for (const r of rounds) {
      byFundingRoundStatus[r.status] = (byFundingRoundStatus[r.status] || 0) + 1;
      totalRaised += r.raisedAmount;
      totalTarget += r.targetAmount;
    }

    return {
      investorCount: investors.length,
      fundingRoundCount: rounds.length,
      capTableEntryCount: capEntries.length,
      communicationCount: communications.length,
      updateCount: updates.length,
      totalRaised,
      totalTarget,
      activeInvestorCount,
      byInvestorType,
      byFundingRoundStatus,
    };
  },
};
