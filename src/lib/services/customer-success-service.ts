import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type HealthScoreCategory = 'product_usage' | 'support' | 'financial' | 'relationship' | 'sentiment';
export type HealthTrend = 'improving' | 'declining' | 'stable';
export type SuccessPlanStatus = 'active' | 'completed' | 'on_hold' | 'cancelled';
export type ChurnRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ChurnRiskStatus = 'open' | 'mitigating' | 'resolved' | 'accepted';
export type ExpansionType = 'upsell' | 'cross_sell' | 'renewal_upgrade' | 'seat_expansion' | 'feature_add';
export type ExpansionStatus = 'identified' | 'qualified' | 'proposed' | 'negotiating' | 'won' | 'lost';
export type RenewalStatus = 'pending' | 'in_review' | 'renewed' | 'churned' | 'downgraded';
export type TouchpointType = 'call' | 'email' | 'meeting' | 'check_in' | 'qbr' | 'training' | 'onsite' | 'other';
export type TouchpointSentiment = 'positive' | 'neutral' | 'negative';

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

interface HealthScoreContent {
  customerId: string;
  score: number;
  category: HealthScoreCategory;
  components: Array<{ name: string; weight: number; value: number; max: number }>;
  trend: HealthTrend;
  calculatedAt: string;
  notes: string;
}

interface SuccessPlanContent {
  customerId: string;
  name: string;
  description: string;
  goals: Array<{ name: string; targetDate: string | null; status: string; owner: string }>;
  milestones: Array<{ name: string; dueDate: string | null; status: string }>;
  status: SuccessPlanStatus;
  owner: string;
  startDate: string;
  endDate: string | null;
}

interface ChurnRiskContent {
  customerId: string;
  riskLevel: ChurnRiskLevel;
  reasons: string[];
  signals: string[];
  mitigationPlan: string;
  assignedTo: string;
  status: ChurnRiskStatus;
  identifiedDate: string;
  mitigatedBy: string;
  mitigatedAt: string | null;
  resolution: string;
  resolvedBy: string;
  resolvedAt: string | null;
}

interface ExpansionContent {
  customerId: string;
  type: ExpansionType;
  opportunity: string;
  estimatedValue: number;
  probability: number;
  expectedCloseDate: string | null;
  status: ExpansionStatus;
  notes: string;
  closedBy: string;
  closedAt: string | null;
}

interface RenewalContent {
  customerId: string;
  contractId: string | null;
  currentMrr: number | null;
  renewalDate: string;
  renewalValue: number | null;
  termMonths: number | null;
  status: RenewalStatus;
  probability: number;
  notes: string;
  closedBy: string;
  closedAt: string | null;
}

interface TouchpointContent {
  customerId: string;
  type: TouchpointType;
  date: string;
  participant: string;
  summary: string;
  outcome: string;
  actionItems: string[];
  nextSteps: string;
  sentiment: TouchpointSentiment;
}

// ── Public interfaces ──

export interface HealthScore {
  id: string;
  organizationId: string;
  workspaceId: string;
  customerId: string;
  score: number;
  category: HealthScoreCategory;
  components: Array<{ name: string; weight: number; value: number; max: number }>;
  trend: HealthTrend;
  calculatedAt: Date;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuccessPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  customerId: string;
  name: string;
  description: string;
  goals: Array<{ name: string; targetDate: Date | null; status: string; owner: string }>;
  milestones: Array<{ name: string; dueDate: Date | null; status: string }>;
  status: SuccessPlanStatus;
  owner: string;
  startDate: Date;
  endDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChurnRisk {
  id: string;
  organizationId: string;
  workspaceId: string;
  customerId: string;
  riskLevel: ChurnRiskLevel;
  reasons: string[];
  signals: string[];
  mitigationPlan: string;
  assignedTo: string;
  status: ChurnRiskStatus;
  identifiedDate: Date;
  mitigatedBy: string;
  mitigatedAt: Date | null;
  resolution: string;
  resolvedBy: string;
  resolvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expansion {
  id: string;
  organizationId: string;
  workspaceId: string;
  customerId: string;
  type: ExpansionType;
  opportunity: string;
  estimatedValue: number;
  probability: number;
  expectedCloseDate: Date | null;
  status: ExpansionStatus;
  notes: string;
  closedBy: string;
  closedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Renewal {
  id: string;
  organizationId: string;
  workspaceId: string;
  customerId: string;
  contractId: string | null;
  currentMrr: number | null;
  renewalDate: Date;
  renewalValue: number | null;
  termMonths: number | null;
  status: RenewalStatus;
  probability: number;
  notes: string;
  closedBy: string;
  closedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Touchpoint {
  id: string;
  organizationId: string;
  workspaceId: string;
  customerId: string;
  type: TouchpointType;
  date: Date;
  participant: string;
  summary: string;
  outcome: string;
  actionItems: string[];
  nextSteps: string;
  sentiment: TouchpointSentiment;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerHealth {
  customerId: string;
  scores: HealthScore[];
  overallScore: number;
  atRisk: boolean;
}

export interface CSMetrics {
  avgHealthScore: number;
  atRiskCustomers: number;
  openChurnRisks: number;
  expansionPipelineValue: number;
  upcomingRenewals: number;
  touchpointFrequency: number;
}

export interface CSStats {
  healthScoreCount: number;
  successPlanCount: number;
  churnRiskCount: number;
  openChurnRiskCount: number;
  expansionCount: number;
  renewalCount: number;
  touchpointCount: number;
  avgHealthScore: number;
  expansionPipelineValue: number;
  byChurnRiskLevel: Record<string, number>;
  byExpansionStatus: Record<string, number>;
  byRenewalStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateHealthScoreInput {
  customerId: string;
  score: number;
  category: HealthScoreCategory;
  components?: Array<{ name: string; weight: number; value: number; max: number }>;
  trend?: HealthTrend;
  calculatedAt?: string;
  notes?: string;
}

export interface UpdateHealthScoreInput {
  score?: number;
  category?: HealthScoreCategory;
  components?: Array<{ name: string; weight: number; value: number; max: number }>;
  trend?: HealthTrend;
  calculatedAt?: string;
  notes?: string;
}

export interface ListHealthScoresOpts {
  customerId?: string;
  category?: HealthScoreCategory;
}

export interface CreateSuccessPlanInput {
  customerId: string;
  name: string;
  description?: string;
  goals: Array<{ name: string; targetDate?: string; status?: string; owner?: string }>;
  milestones?: Array<{ name: string; dueDate?: string; status?: string }>;
  status?: SuccessPlanStatus;
  owner?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSuccessPlanInput {
  name?: string;
  description?: string;
  goals?: Array<{ name: string; targetDate?: string; status?: string; owner?: string }>;
  milestones?: Array<{ name: string; dueDate?: string; status?: string }>;
  status?: SuccessPlanStatus;
  owner?: string;
  startDate?: string;
  endDate?: string;
}

export interface ListSuccessPlansOpts {
  customerId?: string;
  status?: SuccessPlanStatus;
  owner?: string;
}

export interface CreateChurnRiskInput {
  customerId: string;
  riskLevel: ChurnRiskLevel;
  reasons: string[];
  signals?: string[];
  mitigationPlan?: string;
  assignedTo?: string;
  status?: ChurnRiskStatus;
  identifiedDate?: string;
}

export interface UpdateChurnRiskInput {
  riskLevel?: ChurnRiskLevel;
  reasons?: string[];
  signals?: string[];
  mitigationPlan?: string;
  assignedTo?: string;
  status?: ChurnRiskStatus;
  identifiedDate?: string;
}

export interface ListChurnRisksOpts {
  customerId?: string;
  riskLevel?: ChurnRiskLevel;
  status?: ChurnRiskStatus;
}

export interface CreateExpansionInput {
  customerId: string;
  type: ExpansionType;
  opportunity: string;
  estimatedValue: number;
  probability?: number;
  expectedCloseDate?: string;
  status?: ExpansionStatus;
  notes?: string;
}

export interface UpdateExpansionInput {
  type?: ExpansionType;
  opportunity?: string;
  estimatedValue?: number;
  probability?: number;
  expectedCloseDate?: string;
  status?: ExpansionStatus;
  notes?: string;
}

export interface ListExpansionsOpts {
  customerId?: string;
  type?: ExpansionType;
  status?: ExpansionStatus;
}

export interface CreateRenewalInput {
  customerId: string;
  contractId?: string;
  currentMrr?: number;
  renewalDate: string;
  renewalValue?: number;
  termMonths?: number;
  status?: RenewalStatus;
  probability?: number;
  notes?: string;
}

export interface UpdateRenewalInput {
  contractId?: string;
  currentMrr?: number;
  renewalDate?: string;
  renewalValue?: number;
  termMonths?: number;
  status?: RenewalStatus;
  probability?: number;
  notes?: string;
}

export interface ListRenewalsOpts {
  customerId?: string;
  status?: RenewalStatus;
}

export interface CreateTouchpointInput {
  customerId: string;
  type: TouchpointType;
  date: string;
  participant: string;
  summary?: string;
  outcome?: string;
  actionItems?: string[];
  nextSteps?: string;
  sentiment?: TouchpointSentiment;
}

export interface UpdateTouchpointInput {
  type?: TouchpointType;
  date?: string;
  participant?: string;
  summary?: string;
  outcome?: string;
  actionItems?: string[];
  nextSteps?: string;
  sentiment?: TouchpointSentiment;
}

export interface ListTouchpointsOpts {
  customerId?: string;
  type?: TouchpointType;
  sentiment?: TouchpointSentiment;
}

// ── Helpers ──

const fallbackHealth: HealthScoreContent = {
  customerId: '', score: 0, category: 'product_usage', components: [], trend: 'stable', calculatedAt: '', notes: '',
};

const fallbackPlan: SuccessPlanContent = {
  customerId: '', name: '', description: '', goals: [], milestones: [], status: 'active', owner: '', startDate: '', endDate: null,
};

const fallbackChurn: ChurnRiskContent = {
  customerId: '', riskLevel: 'low', reasons: [], signals: [], mitigationPlan: '', assignedTo: '', status: 'open',
  identifiedDate: '', mitigatedBy: '', mitigatedAt: null, resolution: '', resolvedBy: '', resolvedAt: null,
};

const fallbackExpansion: ExpansionContent = {
  customerId: '', type: 'upsell', opportunity: '', estimatedValue: 0, probability: 0, expectedCloseDate: null,
  status: 'identified', notes: '', closedBy: '', closedAt: null,
};

const fallbackRenewal: RenewalContent = {
  customerId: '', contractId: null, currentMrr: null, renewalDate: '', renewalValue: null, termMonths: null,
  status: 'pending', probability: 0, notes: '', closedBy: '', closedAt: null,
};

const fallbackTouchpoint: TouchpointContent = {
  customerId: '', type: 'other', date: '', participant: '', summary: '', outcome: '', actionItems: [], nextSteps: '', sentiment: 'neutral',
};

function parseHealth(raw: string): HealthScoreContent {
  if (!raw) return fallbackHealth;
  try {
    const p = JSON.parse(raw);
    return {
      customerId: p.customerId ?? '',
      score: typeof p.score === 'number' ? p.score : 0,
      category: (p.category as HealthScoreCategory) ?? 'product_usage',
      components: Array.isArray(p.components) ? p.components : [],
      trend: (p.trend as HealthTrend) ?? 'stable',
      calculatedAt: p.calculatedAt ?? '',
      notes: p.notes ?? '',
    };
  } catch { return fallbackHealth; }
}

function parsePlan(raw: string): SuccessPlanContent {
  if (!raw) return fallbackPlan;
  try {
    const p = JSON.parse(raw);
    return {
      customerId: p.customerId ?? '',
      name: p.name ?? '',
      description: p.description ?? '',
      goals: Array.isArray(p.goals) ? p.goals : [],
      milestones: Array.isArray(p.milestones) ? p.milestones : [],
      status: (p.status as SuccessPlanStatus) ?? 'active',
      owner: p.owner ?? '',
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? null,
    };
  } catch { return fallbackPlan; }
}

function parseChurn(raw: string): ChurnRiskContent {
  if (!raw) return fallbackChurn;
  try {
    const p = JSON.parse(raw);
    return {
      customerId: p.customerId ?? '',
      riskLevel: (p.riskLevel as ChurnRiskLevel) ?? 'low',
      reasons: Array.isArray(p.reasons) ? p.reasons : [],
      signals: Array.isArray(p.signals) ? p.signals : [],
      mitigationPlan: p.mitigationPlan ?? '',
      assignedTo: p.assignedTo ?? '',
      status: (p.status as ChurnRiskStatus) ?? 'open',
      identifiedDate: p.identifiedDate ?? '',
      mitigatedBy: p.mitigatedBy ?? '',
      mitigatedAt: p.mitigatedAt ?? null,
      resolution: p.resolution ?? '',
      resolvedBy: p.resolvedBy ?? '',
      resolvedAt: p.resolvedAt ?? null,
    };
  } catch { return fallbackChurn; }
}

function parseExpansion(raw: string): ExpansionContent {
  if (!raw) return fallbackExpansion;
  try {
    const p = JSON.parse(raw);
    return {
      customerId: p.customerId ?? '',
      type: (p.type as ExpansionType) ?? 'upsell',
      opportunity: p.opportunity ?? '',
      estimatedValue: typeof p.estimatedValue === 'number' ? p.estimatedValue : 0,
      probability: typeof p.probability === 'number' ? p.probability : 0,
      expectedCloseDate: p.expectedCloseDate ?? null,
      status: (p.status as ExpansionStatus) ?? 'identified',
      notes: p.notes ?? '',
      closedBy: p.closedBy ?? '',
      closedAt: p.closedAt ?? null,
    };
  } catch { return fallbackExpansion; }
}

function parseRenewal(raw: string): RenewalContent {
  if (!raw) return fallbackRenewal;
  try {
    const p = JSON.parse(raw);
    return {
      customerId: p.customerId ?? '',
      contractId: p.contractId ?? null,
      currentMrr: typeof p.currentMrr === 'number' ? p.currentMrr : null,
      renewalDate: p.renewalDate ?? '',
      renewalValue: typeof p.renewalValue === 'number' ? p.renewalValue : null,
      termMonths: typeof p.termMonths === 'number' ? p.termMonths : null,
      status: (p.status as RenewalStatus) ?? 'pending',
      probability: typeof p.probability === 'number' ? p.probability : 0,
      notes: p.notes ?? '',
      closedBy: p.closedBy ?? '',
      closedAt: p.closedAt ?? null,
    };
  } catch { return fallbackRenewal; }
}

function parseTouchpoint(raw: string): TouchpointContent {
  if (!raw) return fallbackTouchpoint;
  try {
    const p = JSON.parse(raw);
    return {
      customerId: p.customerId ?? '',
      type: (p.type as TouchpointType) ?? 'other',
      date: p.date ?? '',
      participant: p.participant ?? '',
      summary: p.summary ?? '',
      outcome: p.outcome ?? '',
      actionItems: Array.isArray(p.actionItems) ? p.actionItems : [],
      nextSteps: p.nextSteps ?? '',
      sentiment: (p.sentiment as TouchpointSentiment) ?? 'neutral',
    };
  } catch { return fallbackTouchpoint; }
}

function toHealth(row: MemoryRow): HealthScore {
  const c = parseHealth(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    customerId: c.customerId, score: c.score, category: c.category, components: c.components,
    trend: c.trend, calculatedAt: c.calculatedAt ? new Date(c.calculatedAt) : row.createdAt,
    notes: c.notes, createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPlan(row: MemoryRow): SuccessPlan {
  const c = parsePlan(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    customerId: c.customerId, name: c.name, description: c.description,
    goals: c.goals.map((g) => ({
      name: g.name, targetDate: g.targetDate ? new Date(g.targetDate) : null,
      status: g.status ?? 'pending', owner: g.owner ?? '',
    })),
    milestones: c.milestones.map((m) => ({
      name: m.name, dueDate: m.dueDate ? new Date(m.dueDate) : null, status: m.status ?? 'pending',
    })),
    status: c.status, owner: c.owner,
    startDate: c.startDate ? new Date(c.startDate) : row.createdAt,
    endDate: c.endDate ? new Date(c.endDate) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toChurn(row: MemoryRow): ChurnRisk {
  const c = parseChurn(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    customerId: c.customerId, riskLevel: c.riskLevel, reasons: c.reasons, signals: c.signals,
    mitigationPlan: c.mitigationPlan, assignedTo: c.assignedTo, status: c.status,
    identifiedDate: c.identifiedDate ? new Date(c.identifiedDate) : row.createdAt,
    mitigatedBy: c.mitigatedBy, mitigatedAt: c.mitigatedAt ? new Date(c.mitigatedAt) : null,
    resolution: c.resolution, resolvedBy: c.resolvedBy, resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toExpansion(row: MemoryRow): Expansion {
  const c = parseExpansion(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    customerId: c.customerId, type: c.type, opportunity: c.opportunity,
    estimatedValue: c.estimatedValue, probability: c.probability,
    expectedCloseDate: c.expectedCloseDate ? new Date(c.expectedCloseDate) : null,
    status: c.status, notes: c.notes, closedBy: c.closedBy,
    closedAt: c.closedAt ? new Date(c.closedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRenewal(row: MemoryRow): Renewal {
  const c = parseRenewal(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    customerId: c.customerId, contractId: c.contractId, currentMrr: c.currentMrr,
    renewalDate: c.renewalDate ? new Date(c.renewalDate) : row.createdAt,
    renewalValue: c.renewalValue, termMonths: c.termMonths, status: c.status,
    probability: c.probability, notes: c.notes, closedBy: c.closedBy,
    closedAt: c.closedAt ? new Date(c.closedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTouchpoint(row: MemoryRow): Touchpoint {
  const c = parseTouchpoint(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    customerId: c.customerId, type: c.type,
    date: c.date ? new Date(c.date) : row.createdAt,
    participant: c.participant, summary: c.summary, outcome: c.outcome,
    actionItems: c.actionItems, nextSteps: c.nextSteps, sentiment: c.sentiment,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function calculateOverallScore(components: Array<{ name: string; weight: number; value: number; max: number }>): number {
  if (!components || components.length === 0) return 0;
  const totalWeight = components.reduce((sum, c) => sum + (c.weight || 0), 0);
  if (totalWeight === 0) return 0;
  const weighted = components.reduce((sum, c) => {
    const ratio = c.max > 0 ? (c.value / c.max) : 0;
    return sum + (ratio * (c.weight / totalWeight) * 100);
  }, 0);
  return Math.round(weighted);
}

// ── Customer Success Service ──

export const CustomerSuccessService = {
  // ── Health Scores ──

  async createHealthScore(
    organizationId: string,
    workspaceId: string,
    input: CreateHealthScoreInput,
    createdBy: string,
  ): Promise<HealthScore> {
    const components = input.components ?? [];
    const score = components.length > 0 ? calculateOverallScore(components) : input.score;

    const content: HealthScoreContent = {
      customerId: input.customerId.trim(),
      score,
      category: input.category,
      components,
      trend: input.trend ?? 'stable',
      calculatedAt: input.calculatedAt ?? new Date().toISOString(),
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'cs_health_score',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.customerId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['cs_health_score', content.category, content.trend]),
        createdBy,
      },
    });

    return toHealth(row as MemoryRow);
  },

  async getHealthScore(id: string): Promise<HealthScore | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'cs_health_score') return null;
    return toHealth(row as MemoryRow);
  },

  async listHealthScores(organizationId: string, opts: ListHealthScoresOpts = {}): Promise<HealthScore[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'cs_health_score', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toHealth(r as MemoryRow));
    if (opts.customerId) records = records.filter((h) => h.customerId === opts.customerId);
    if (opts.category) records = records.filter((h) => h.category === opts.category);
    return records;
  },

  async updateHealthScore(id: string, input: UpdateHealthScoreInput): Promise<HealthScore | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseHealth(existing.content);
    if (input.score !== undefined) content.score = input.score;
    if (input.category !== undefined) content.category = input.category;
    if (input.components !== undefined) {
      content.components = input.components;
      if (input.components.length > 0) content.score = calculateOverallScore(input.components);
    }
    if (input.trend !== undefined) content.trend = input.trend;
    if (input.calculatedAt !== undefined) content.calculatedAt = input.calculatedAt;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['cs_health_score', content.category, content.trend]),
        },
      }), null,
    );
    if (!row) return null;
    return toHealth(row as MemoryRow);
  },

  async deleteHealthScore(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async getCustomerHealth(organizationId: string, customerId: string): Promise<CustomerHealth> {
    const scores = await CustomerSuccessService.listHealthScores(organizationId, { customerId });
    const byCategory = new Map<HealthScoreCategory, HealthScore>();
    for (const s of scores) {
      const existing = byCategory.get(s.category);
      if (!existing || s.calculatedAt > existing.calculatedAt) {
        byCategory.set(s.category, s);
      }
    }
    const latestScores = Array.from(byCategory.values());
    const overallScore = latestScores.length > 0
      ? Math.round(latestScores.reduce((sum, s) => sum + s.score, 0) / latestScores.length)
      : 0;
    const atRisk = overallScore < 50;

    return { customerId, scores: latestScores, overallScore, atRisk };
  },

  // ── Success Plans ──

  async createSuccessPlan(
    organizationId: string,
    workspaceId: string,
    input: CreateSuccessPlanInput,
    createdBy: string,
  ): Promise<SuccessPlan> {
    const content: SuccessPlanContent = {
      customerId: input.customerId.trim(),
      name: input.name.trim(),
      description: input.description ?? '',
      goals: input.goals.map((g) => ({
        name: g.name, targetDate: g.targetDate ?? null, status: g.status ?? 'pending', owner: g.owner ?? '',
      })),
      milestones: (input.milestones ?? []).map((m) => ({
        name: m.name, dueDate: m.dueDate ?? null, status: m.status ?? 'pending',
      })),
      status: input.status ?? 'active',
      owner: input.owner ?? '',
      startDate: input.startDate ?? new Date().toISOString(),
      endDate: input.endDate ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'cs_success_plan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.customerId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['cs_success_plan', content.status]),
        createdBy,
      },
    });

    return toPlan(row as MemoryRow);
  },

  async getSuccessPlan(id: string): Promise<SuccessPlan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'cs_success_plan') return null;
    return toPlan(row as MemoryRow);
  },

  async listSuccessPlans(organizationId: string, opts: ListSuccessPlansOpts = {}): Promise<SuccessPlan[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'cs_success_plan', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toPlan(r as MemoryRow));
    if (opts.customerId) records = records.filter((p) => p.customerId === opts.customerId);
    if (opts.status) records = records.filter((p) => p.status === opts.status);
    if (opts.owner) records = records.filter((p) => p.owner === opts.owner);
    return records;
  },

  async updateSuccessPlan(id: string, input: UpdateSuccessPlanInput): Promise<SuccessPlan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parsePlan(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.goals !== undefined) content.goals = input.goals.map((g) => ({
      name: g.name, targetDate: g.targetDate ?? null, status: g.status ?? 'pending', owner: g.owner ?? '',
    }));
    if (input.milestones !== undefined) content.milestones = input.milestones.map((m) => ({
      name: m.name, dueDate: m.dueDate ?? null, status: m.status ?? 'pending',
    }));
    if (input.status !== undefined) content.status = input.status;
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['cs_success_plan', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toPlan(row as MemoryRow);
  },

  async deleteSuccessPlan(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Churn Risks ──

  async createChurnRisk(
    organizationId: string,
    workspaceId: string,
    input: CreateChurnRiskInput,
    createdBy: string,
  ): Promise<ChurnRisk> {
    const content: ChurnRiskContent = {
      customerId: input.customerId.trim(),
      riskLevel: input.riskLevel,
      reasons: input.reasons,
      signals: input.signals ?? [],
      mitigationPlan: input.mitigationPlan ?? '',
      assignedTo: input.assignedTo ?? '',
      status: input.status ?? 'open',
      identifiedDate: input.identifiedDate ?? new Date().toISOString(),
      mitigatedBy: '', mitigatedAt: null, resolution: '', resolvedBy: '', resolvedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'cs_churn_risk',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.customerId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['cs_churn_risk', content.riskLevel, content.status]),
        createdBy,
      },
    });

    return toChurn(row as MemoryRow);
  },

  async getChurnRisk(id: string): Promise<ChurnRisk | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'cs_churn_risk') return null;
    return toChurn(row as MemoryRow);
  },

  async listChurnRisks(organizationId: string, opts: ListChurnRisksOpts = {}): Promise<ChurnRisk[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'cs_churn_risk', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toChurn(r as MemoryRow));
    if (opts.customerId) records = records.filter((c) => c.customerId === opts.customerId);
    if (opts.riskLevel) records = records.filter((c) => c.riskLevel === opts.riskLevel);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    return records;
  },

  async updateChurnRisk(id: string, input: UpdateChurnRiskInput): Promise<ChurnRisk | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseChurn(existing.content);
    if (input.riskLevel !== undefined) content.riskLevel = input.riskLevel;
    if (input.reasons !== undefined) content.reasons = input.reasons;
    if (input.signals !== undefined) content.signals = input.signals;
    if (input.mitigationPlan !== undefined) content.mitigationPlan = input.mitigationPlan;
    if (input.assignedTo !== undefined) content.assignedTo = input.assignedTo;
    if (input.status !== undefined) content.status = input.status;
    if (input.identifiedDate !== undefined) content.identifiedDate = input.identifiedDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['cs_churn_risk', content.riskLevel, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toChurn(row as MemoryRow);
  },

  async mitigateChurnRisk(id: string, mitigation: string, mitigatedBy: string): Promise<ChurnRisk | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseChurn(existing.content);
    content.mitigationPlan = mitigation;
    content.mitigatedBy = mitigatedBy;
    content.mitigatedAt = new Date().toISOString();
    content.status = 'mitigating';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['cs_churn_risk', content.riskLevel, 'mitigating']),
        },
      }), null,
    );
    if (!row) return null;
    return toChurn(row as MemoryRow);
  },

  async resolveChurnRisk(id: string, resolution: string, resolvedBy: string): Promise<ChurnRisk | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseChurn(existing.content);
    content.resolution = resolution;
    content.resolvedBy = resolvedBy;
    content.resolvedAt = new Date().toISOString();
    content.status = 'resolved';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['cs_churn_risk', content.riskLevel, 'resolved']),
        },
      }), null,
    );
    if (!row) return null;
    return toChurn(row as MemoryRow);
  },

  // ── Expansions ──

  async createExpansion(
    organizationId: string,
    workspaceId: string,
    input: CreateExpansionInput,
    createdBy: string,
  ): Promise<Expansion> {
    const content: ExpansionContent = {
      customerId: input.customerId.trim(),
      type: input.type,
      opportunity: input.opportunity,
      estimatedValue: input.estimatedValue,
      probability: input.probability ?? 0,
      expectedCloseDate: input.expectedCloseDate ?? null,
      status: input.status ?? 'identified',
      notes: input.notes ?? '',
      closedBy: '', closedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'cs_expansion',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.customerId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['cs_expansion', content.type, content.status]),
        createdBy,
      },
    });

    return toExpansion(row as MemoryRow);
  },

  async getExpansion(id: string): Promise<Expansion | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'cs_expansion') return null;
    return toExpansion(row as MemoryRow);
  },

  async listExpansions(organizationId: string, opts: ListExpansionsOpts = {}): Promise<Expansion[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'cs_expansion', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toExpansion(r as MemoryRow));
    if (opts.customerId) records = records.filter((e) => e.customerId === opts.customerId);
    if (opts.type) records = records.filter((e) => e.type === opts.type);
    if (opts.status) records = records.filter((e) => e.status === opts.status);
    return records;
  },

  async updateExpansion(id: string, input: UpdateExpansionInput): Promise<Expansion | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseExpansion(existing.content);
    if (input.type !== undefined) content.type = input.type;
    if (input.opportunity !== undefined) content.opportunity = input.opportunity;
    if (input.estimatedValue !== undefined) content.estimatedValue = input.estimatedValue;
    if (input.probability !== undefined) content.probability = input.probability;
    if (input.expectedCloseDate !== undefined) content.expectedCloseDate = input.expectedCloseDate;
    if (input.status !== undefined) content.status = input.status;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['cs_expansion', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toExpansion(row as MemoryRow);
  },

  async closeExpansion(id: string, status: 'won' | 'lost', closedBy: string, notes?: string): Promise<Expansion | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseExpansion(existing.content);
    content.status = status;
    content.closedBy = closedBy;
    content.closedAt = new Date().toISOString();
    if (notes !== undefined) content.notes = notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['cs_expansion', content.type, status]),
        },
      }), null,
    );
    if (!row) return null;
    return toExpansion(row as MemoryRow);
  },

  // ── Renewals ──

  async createRenewal(
    organizationId: string,
    workspaceId: string,
    input: CreateRenewalInput,
    createdBy: string,
  ): Promise<Renewal> {
    const content: RenewalContent = {
      customerId: input.customerId.trim(),
      contractId: input.contractId ?? null,
      currentMrr: input.currentMrr ?? null,
      renewalDate: input.renewalDate,
      renewalValue: input.renewalValue ?? null,
      termMonths: input.termMonths ?? null,
      status: input.status ?? 'pending',
      probability: input.probability ?? 0,
      notes: input.notes ?? '',
      closedBy: '', closedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'cs_renewal',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.customerId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['cs_renewal', content.status]),
        createdBy,
      },
    });

    return toRenewal(row as MemoryRow);
  },

  async getRenewal(id: string): Promise<Renewal | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'cs_renewal') return null;
    return toRenewal(row as MemoryRow);
  },

  async listRenewals(organizationId: string, opts: ListRenewalsOpts = {}): Promise<Renewal[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'cs_renewal', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toRenewal(r as MemoryRow));
    if (opts.customerId) records = records.filter((r) => r.customerId === opts.customerId);
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    return records;
  },

  async updateRenewal(id: string, input: UpdateRenewalInput): Promise<Renewal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseRenewal(existing.content);
    if (input.contractId !== undefined) content.contractId = input.contractId;
    if (input.currentMrr !== undefined) content.currentMrr = input.currentMrr;
    if (input.renewalDate !== undefined) content.renewalDate = input.renewalDate;
    if (input.renewalValue !== undefined) content.renewalValue = input.renewalValue;
    if (input.termMonths !== undefined) content.termMonths = input.termMonths;
    if (input.status !== undefined) content.status = input.status;
    if (input.probability !== undefined) content.probability = input.probability;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['cs_renewal', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toRenewal(row as MemoryRow);
  },

  async closeRenewal(id: string, status: 'renewed' | 'churned' | 'downgraded', closedBy: string, notes?: string): Promise<Renewal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseRenewal(existing.content);
    content.status = status;
    content.closedBy = closedBy;
    content.closedAt = new Date().toISOString();
    if (notes !== undefined) content.notes = notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['cs_renewal', status]),
        },
      }), null,
    );
    if (!row) return null;
    return toRenewal(row as MemoryRow);
  },

  // ── Touchpoints ──

  async createTouchpoint(
    organizationId: string,
    workspaceId: string,
    input: CreateTouchpointInput,
    createdBy: string,
  ): Promise<Touchpoint> {
    const content: TouchpointContent = {
      customerId: input.customerId.trim(),
      type: input.type,
      date: input.date,
      participant: input.participant,
      summary: input.summary ?? '',
      outcome: input.outcome ?? '',
      actionItems: input.actionItems ?? [],
      nextSteps: input.nextSteps ?? '',
      sentiment: input.sentiment ?? 'neutral',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'cs_touchpoint',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.customerId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['cs_touchpoint', content.type, content.sentiment]),
        createdBy,
      },
    });

    return toTouchpoint(row as MemoryRow);
  },

  async getTouchpoint(id: string): Promise<Touchpoint | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'cs_touchpoint') return null;
    return toTouchpoint(row as MemoryRow);
  },

  async listTouchpoints(organizationId: string, opts: ListTouchpointsOpts = {}): Promise<Touchpoint[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'cs_touchpoint', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toTouchpoint(r as MemoryRow));
    if (opts.customerId) records = records.filter((t) => t.customerId === opts.customerId);
    if (opts.type) records = records.filter((t) => t.type === opts.type);
    if (opts.sentiment) records = records.filter((t) => t.sentiment === opts.sentiment);
    return records;
  },

  async updateTouchpoint(id: string, input: UpdateTouchpointInput): Promise<Touchpoint | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTouchpoint(existing.content);
    if (input.type !== undefined) content.type = input.type;
    if (input.date !== undefined) content.date = input.date;
    if (input.participant !== undefined) content.participant = input.participant;
    if (input.summary !== undefined) content.summary = input.summary;
    if (input.outcome !== undefined) content.outcome = input.outcome;
    if (input.actionItems !== undefined) content.actionItems = input.actionItems;
    if (input.nextSteps !== undefined) content.nextSteps = input.nextSteps;
    if (input.sentiment !== undefined) content.sentiment = input.sentiment;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['cs_touchpoint', content.type, content.sentiment]),
        },
      }), null,
    );
    if (!row) return null;
    return toTouchpoint(row as MemoryRow);
  },

  // ── Metrics ──

  async getCSMetrics(organizationId: string): Promise<CSMetrics> {
    const [healthScores, churnRisks, expansions, renewals, touchpoints] = await Promise.all([
      CustomerSuccessService.listHealthScores(organizationId),
      CustomerSuccessService.listChurnRisks(organizationId),
      CustomerSuccessService.listExpansions(organizationId),
      CustomerSuccessService.listRenewals(organizationId),
      CustomerSuccessService.listTouchpoints(organizationId),
    ]);

    // Latest health score per customer
    const customerScores = new Map<string, HealthScore>();
    for (const h of healthScores) {
      const existing = customerScores.get(h.customerId);
      if (!existing || h.calculatedAt > existing.calculatedAt) {
        customerScores.set(h.customerId, h);
      }
    }
    const latestScores = Array.from(customerScores.values());
    const avgHealthScore = latestScores.length > 0
      ? Math.round(latestScores.reduce((sum, h) => sum + h.score, 0) / latestScores.length)
      : 0;
    const atRiskCustomers = latestScores.filter((h) => h.score < 50).length;

    const openChurnRisks = churnRisks.filter((c) => c.status === 'open' || c.status === 'mitigating').length;

    const openExpansions = expansions.filter((e) => e.status !== 'won' && e.status !== 'lost');
    const expansionPipelineValue = openExpansions.reduce((sum, e) => sum + e.estimatedValue, 0);

    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const upcomingRenewals = renewals.filter(
      (r) => r.status === 'pending' && r.renewalDate >= now && r.renewalDate <= ninetyDaysFromNow,
    ).length;

    // Touchpoint frequency: touchpoints in last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentTouchpoints = touchpoints.filter((t) => t.date >= thirtyDaysAgo).length;
    const touchpointFrequency = recentTouchpoints;

    return {
      avgHealthScore,
      atRiskCustomers,
      openChurnRisks,
      expansionPipelineValue,
      upcomingRenewals,
      touchpointFrequency,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<CSStats> {
    const [healthScores, successPlans, churnRisks, expansions, renewals, touchpoints, metrics] = await Promise.all([
      CustomerSuccessService.listHealthScores(organizationId),
      CustomerSuccessService.listSuccessPlans(organizationId),
      CustomerSuccessService.listChurnRisks(organizationId),
      CustomerSuccessService.listExpansions(organizationId),
      CustomerSuccessService.listRenewals(organizationId),
      CustomerSuccessService.listTouchpoints(organizationId),
      CustomerSuccessService.getCSMetrics(organizationId),
    ]);

    const byChurnRiskLevel: Record<string, number> = {};
    let openChurnRiskCount = 0;
    for (const c of churnRisks) {
      byChurnRiskLevel[c.riskLevel] = (byChurnRiskLevel[c.riskLevel] || 0) + 1;
      if (c.status === 'open' || c.status === 'mitigating') openChurnRiskCount++;
    }

    const byExpansionStatus: Record<string, number> = {};
    for (const e of expansions) {
      byExpansionStatus[e.status] = (byExpansionStatus[e.status] || 0) + 1;
    }

    const byRenewalStatus: Record<string, number> = {};
    for (const r of renewals) {
      byRenewalStatus[r.status] = (byRenewalStatus[r.status] || 0) + 1;
    }

    const openExpansions = expansions.filter((e) => e.status !== 'won' && e.status !== 'lost');
    const expansionPipelineValue = openExpansions.reduce((sum, e) => sum + e.estimatedValue, 0);

    return {
      healthScoreCount: healthScores.length,
      successPlanCount: successPlans.length,
      churnRiskCount: churnRisks.length,
      openChurnRiskCount,
      expansionCount: expansions.length,
      renewalCount: renewals.length,
      touchpointCount: touchpoints.length,
      avgHealthScore: metrics.avgHealthScore,
      expansionPipelineValue,
      byChurnRiskLevel,
      byExpansionStatus,
      byRenewalStatus,
    };
  },
};
