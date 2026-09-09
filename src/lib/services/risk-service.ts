import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type RiskCategory =
  | 'strategic'
  | 'operational'
  | 'financial'
  | 'compliance'
  | 'security'
  | 'technology'
  | 'reputation'
  | 'external';

export type RiskStatus =
  | 'identified'
  | 'assessed'
  | 'mitigating'
  | 'accepted'
  | 'closed';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Raw Memory row as stored in the database. */
interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Parsed content payload for a risk Memory. */
interface RiskContent {
  title: string;
  description: string;
  category: RiskCategory;
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: RiskLevel;
  owner: string | null;
  status: RiskStatus;
  mitigationPlan: string;
  tags: string[];
}

/** A structured risk returned to callers. */
export interface Risk {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  category: RiskCategory;
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: RiskLevel;
  owner: string | null;
  status: RiskStatus;
  mitigationPlan: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRiskInput {
  title: string;
  description?: string;
  category: RiskCategory;
  likelihood: number;
  impact: number;
  owner?: string;
  status?: RiskStatus;
  mitigationPlan?: string;
  tags?: string[];
  workspaceId?: string;
  createdBy: string;
}

export interface ListRiskOpts {
  category?: RiskCategory;
  status?: RiskStatus;
  riskLevel?: RiskLevel;
  owner?: string;
  search?: string;
}

export interface UpdateRiskInput {
  title?: string;
  description?: string;
  category?: RiskCategory;
  likelihood?: number;
  impact?: number;
  owner?: string;
  status?: RiskStatus;
  mitigationPlan?: string;
  tags?: string[];
}

export interface RiskStats {
  totalRisks: number;
  byCategory: Record<string, number>;
  byLevel: Record<RiskLevel, number>;
  byStatus: Record<string, number>;
  avgRiskScore: number;
  highCriticalCount: number;
}

export interface RiskMatrix {
  matrix: number[][]; // [likelihood][impact]
  total: number;
}

// ── Helpers ──

const fallbackContent: RiskContent = {
  title: '',
  description: '',
  category: 'operational',
  likelihood: 1,
  impact: 1,
  riskScore: 1,
  riskLevel: 'low',
  owner: null,
  status: 'identified',
  mitigationPlan: '',
  tags: [],
};

function calculateRiskScore(likelihood: number, impact: number): number {
  return likelihood * impact;
}

function calculateRiskLevel(score: number): RiskLevel {
  if (score <= 5) return 'low';
  if (score <= 12) return 'medium';
  if (score <= 20) return 'high';
  return 'critical';
}

function parseRiskContent(raw: string): RiskContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      category: (parsed.category as RiskCategory) ?? 'operational',
      likelihood: typeof parsed.likelihood === 'number' ? parsed.likelihood : 1,
      impact: typeof parsed.impact === 'number' ? parsed.impact : 1,
      riskScore: typeof parsed.riskScore === 'number' ? parsed.riskScore : 1,
      riskLevel: (parsed.riskLevel as RiskLevel) ?? 'low',
      owner: parsed.owner ?? null,
      status: (parsed.status as RiskStatus) ?? 'identified',
      mitigationPlan: parsed.mitigationPlan ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch {
    return fallbackContent;
  }
}

function toRisk(row: MemoryRow): Risk {
  const content = parseRiskContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    title: content.title,
    description: content.description,
    category: content.category,
    likelihood: content.likelihood,
    impact: content.impact,
    riskScore: content.riskScore,
    riskLevel: content.riskLevel,
    owner: content.owner,
    status: content.status,
    mitigationPlan: content.mitigationPlan,
    tags: content.tags,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Risk Service ──

export const RiskService = {
  /**
   * Create a risk. Stored as a Memory with type='risk'.
   */
  async create(organizationId: string, input: CreateRiskInput): Promise<Risk> {
    const title = input.title.trim();
    const likelihood = Math.max(1, Math.min(5, input.likelihood));
    const impact = Math.max(1, Math.min(5, input.impact));
    const riskScore = calculateRiskScore(likelihood, impact);
    const riskLevel = calculateRiskLevel(riskScore);
    const status: RiskStatus = input.status ?? 'identified';
    const content: RiskContent = {
      title,
      description: input.description ?? '',
      category: input.category,
      likelihood,
      impact,
      riskScore,
      riskLevel,
      owner: input.owner ?? null,
      status,
      mitigationPlan: input.mitigationPlan ?? '',
      tags: input.tags ?? [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'risk',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['risk', input.category, riskLevel]),
        createdBy: input.createdBy,
      },
    });

    return toRisk(row as MemoryRow);
  },

  /**
   * Get a single risk by ID.
   */
  async get(id: string): Promise<Risk | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toRisk(row as MemoryRow);
  },

  /**
   * List risks for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListRiskOpts = {}): Promise<Risk[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'risk',
            organizationId,
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );

    let risks = rows.map((r) => toRisk(r as MemoryRow));

    if (opts.category) {
      risks = risks.filter((r) => r.category === opts.category);
    }
    if (opts.status) {
      risks = risks.filter((r) => r.status === opts.status);
    }
    if (opts.riskLevel) {
      risks = risks.filter((r) => r.riskLevel === opts.riskLevel);
    }
    if (opts.owner) {
      risks = risks.filter((r) => r.owner === opts.owner);
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      risks = risks.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }

    return risks;
  },

  /**
   * Update a risk (recalculates score/level if likelihood/impact changes).
   */
  async update(id: string, input: UpdateRiskInput): Promise<Risk | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseRiskContent(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.status !== undefined) content.status = input.status;
    if (input.mitigationPlan !== undefined) content.mitigationPlan = input.mitigationPlan;
    if (input.tags !== undefined) content.tags = input.tags;

    if (input.likelihood !== undefined || input.impact !== undefined) {
      const likelihood =
        input.likelihood !== undefined
          ? Math.max(1, Math.min(5, input.likelihood))
          : content.likelihood;
      const impact =
        input.impact !== undefined
          ? Math.max(1, Math.min(5, input.impact))
          : content.impact;
      content.likelihood = likelihood;
      content.impact = impact;
      content.riskScore = calculateRiskScore(likelihood, impact);
      content.riskLevel = calculateRiskLevel(content.riskScore);
    }

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['risk', content.category, content.riskLevel]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toRisk(row as MemoryRow);
  },

  /**
   * Delete a risk.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Assess a risk (update likelihood/impact, recalculate score).
   */
  async assess(id: string, likelihood: number, impact: number): Promise<Risk | null> {
    return RiskService.update(id, { likelihood, impact });
  },

  /**
   * Set the mitigation plan for a risk.
   */
  async setMitigationPlan(id: string, plan: string): Promise<Risk | null> {
    return RiskService.update(id, { mitigationPlan: plan });
  },

  /**
   * Change the status of a risk.
   */
  async changeStatus(id: string, status: RiskStatus): Promise<Risk | null> {
    return RiskService.update(id, { status });
  },

  /**
   * Assign an owner to a risk.
   */
  async assignOwner(id: string, owner: string): Promise<Risk | null> {
    return RiskService.update(id, { owner });
  },

  /**
   * Get risks grouped by category.
   */
  async getByCategory(organizationId: string): Promise<Record<string, Risk[]>> {
    const risks = await RiskService.list(organizationId);
    const grouped: Record<string, Risk[]> = {};
    for (const r of risks) {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push(r);
    }
    return grouped;
  },

  /**
   * Get risks grouped by risk level.
   */
  async getByLevel(organizationId: string): Promise<Record<RiskLevel, Risk[]>> {
    const risks = await RiskService.list(organizationId);
    const grouped: Record<RiskLevel, Risk[]> = {
      low: [],
      medium: [],
      high: [],
      critical: [],
    };
    for (const r of risks) {
      grouped[r.riskLevel].push(r);
    }
    return grouped;
  },

  /**
   * Get risks grouped by status.
   */
  async getByStatus(organizationId: string): Promise<Record<string, Risk[]>> {
    const risks = await RiskService.list(organizationId);
    const grouped: Record<string, Risk[]> = {};
    for (const r of risks) {
      if (!grouped[r.status]) grouped[r.status] = [];
      grouped[r.status].push(r);
    }
    return grouped;
  },

  /**
   * Get risks with high or critical level.
   */
  async getHighRisks(organizationId: string): Promise<Risk[]> {
    const risks = await RiskService.list(organizationId);
    return risks.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'critical');
  },

  /**
   * Get a 5x5 risk matrix (likelihood vs impact) with counts.
   */
  async getRiskMatrix(organizationId: string): Promise<RiskMatrix> {
    const risks = await RiskService.list(organizationId);
    const matrix: number[][] = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
    let total = 0;
    for (const r of risks) {
      const li = Math.max(0, Math.min(4, r.likelihood - 1));
      const ii = Math.max(0, Math.min(4, r.impact - 1));
      matrix[li][ii] += 1;
      total += 1;
    }
    return { matrix, total };
  },

  /**
   * Get risk stats for an organization.
   */
  async getStats(organizationId: string): Promise<RiskStats> {
    const risks = await RiskService.list(organizationId);
    const byCategory: Record<string, number> = {};
    const byLevel: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const byStatus: Record<string, number> = {};
    let totalScore = 0;
    let highCriticalCount = 0;

    for (const r of risks) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      byLevel[r.riskLevel] += 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      totalScore += r.riskScore;
      if (r.riskLevel === 'high' || r.riskLevel === 'critical') {
        highCriticalCount += 1;
      }
    }

    return {
      totalRisks: risks.length,
      byCategory,
      byLevel,
      byStatus,
      avgRiskScore: risks.length > 0 ? totalScore / risks.length : 0,
      highCriticalCount,
    };
  },
};
