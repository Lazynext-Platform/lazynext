import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type SupplierGrade = 'A' | 'B' | 'C' | 'D' | 'F';

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

/** Parsed content payload for a supplier scorecard Memory. */
interface ScorecardContent {
  vendorId: string;
  vendorName: string;
  period: string;
  qualityScore: number;
  deliveryScore: number;
  costScore: number;
  serviceScore: number;
  complianceScore: number;
  overallScore: number;
  grade: SupplierGrade;
  notes: string;
}

/** A structured supplier scorecard returned to callers. */
export interface SupplierScorecard {
  id: string;
  organizationId: string;
  workspaceId: string;
  vendorId: string;
  vendorName: string;
  period: string;
  qualityScore: number;
  deliveryScore: number;
  costScore: number;
  serviceScore: number;
  complianceScore: number;
  overallScore: number;
  grade: SupplierGrade;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScorecardInput {
  vendorId: string;
  vendorName: string;
  period: string;
  qualityScore: number;
  deliveryScore: number;
  costScore: number;
  serviceScore: number;
  complianceScore: number;
  notes?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface UpdateScorecardInput {
  vendorName?: string;
  period?: string;
  qualityScore?: number;
  deliveryScore?: number;
  costScore?: number;
  serviceScore?: number;
  complianceScore?: number;
  notes?: string;
}

export interface ListScorecardOpts {
  vendorId?: string;
  period?: string;
  grade?: SupplierGrade;
  search?: string;
}

export interface ScorecardStats {
  totalScorecards: number;
  avgScore: number;
  gradeDistribution: Record<SupplierGrade, number>;
}

// ── Helpers ──

const fallbackContent: ScorecardContent = {
  vendorId: '',
  vendorName: '',
  period: '',
  qualityScore: 0,
  deliveryScore: 0,
  costScore: 0,
  serviceScore: 0,
  complianceScore: 0,
  overallScore: 0,
  grade: 'F',
  notes: '',
};

/** Calculate overall score = average of the five dimension scores. */
export function calcOverallScore(scores: {
  qualityScore: number;
  deliveryScore: number;
  costScore: number;
  serviceScore: number;
  complianceScore: number;
}): number {
  const sum =
    scores.qualityScore +
    scores.deliveryScore +
    scores.costScore +
    scores.serviceScore +
    scores.complianceScore;
  return Math.round((sum / 5) * 100) / 100;
}

/** Map an overall score (1-10) to a letter grade. */
export function calcGrade(overall: number): SupplierGrade {
  if (overall >= 8.5) return 'A';
  if (overall >= 7) return 'B';
  if (overall >= 5.5) return 'C';
  if (overall >= 4) return 'D';
  return 'F';
}

function parseScorecardContent(raw: string): ScorecardContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    const qualityScore = Number(parsed.qualityScore) || 0;
    const deliveryScore = Number(parsed.deliveryScore) || 0;
    const costScore = Number(parsed.costScore) || 0;
    const serviceScore = Number(parsed.serviceScore) || 0;
    const complianceScore = Number(parsed.complianceScore) || 0;
    const overallScore =
      parsed.overallScore !== undefined
        ? Number(parsed.overallScore)
        : calcOverallScore({
            qualityScore,
            deliveryScore,
            costScore,
            serviceScore,
            complianceScore,
          });
    return {
      vendorId: parsed.vendorId ?? '',
      vendorName: parsed.vendorName ?? '',
      period: parsed.period ?? '',
      qualityScore,
      deliveryScore,
      costScore,
      serviceScore,
      complianceScore,
      overallScore,
      grade: (parsed.grade as SupplierGrade) ?? calcGrade(overallScore),
      notes: parsed.notes ?? '',
    };
  } catch {
    return fallbackContent;
  }
}

function toScorecard(row: MemoryRow): SupplierScorecard {
  const content = parseScorecardContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    vendorId: content.vendorId,
    vendorName: content.vendorName,
    period: content.period,
    qualityScore: content.qualityScore,
    deliveryScore: content.deliveryScore,
    costScore: content.costScore,
    serviceScore: content.serviceScore,
    complianceScore: content.complianceScore,
    overallScore: content.overallScore,
    grade: content.grade,
    notes: content.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Supplier Scorecard Service ──

export const SupplierScorecardService = {
  /**
   * Create a supplier scorecard. Stored as a Memory with type='supplier_scorecard'.
   */
  async create(
    organizationId: string,
    input: CreateScorecardInput,
  ): Promise<SupplierScorecard> {
    const overallScore = calcOverallScore(input);
    const grade = calcGrade(overallScore);
    const content: ScorecardContent = {
      vendorId: input.vendorId,
      vendorName: input.vendorName,
      period: input.period,
      qualityScore: input.qualityScore,
      deliveryScore: input.deliveryScore,
      costScore: input.costScore,
      serviceScore: input.serviceScore,
      complianceScore: input.complianceScore,
      overallScore,
      grade,
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'supplier_scorecard',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['supplier_scorecard', grade]),
        createdBy: input.createdBy,
      },
    });

    return toScorecard(row as MemoryRow);
  },

  /**
   * Get a single scorecard by ID.
   */
  async get(id: string): Promise<SupplierScorecard | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toScorecard(row as MemoryRow);
  },

  /**
   * List scorecards for an organization with optional filters.
   */
  async list(
    organizationId: string,
    opts: ListScorecardOpts = {},
  ): Promise<SupplierScorecard[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'supplier_scorecard',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let scorecards = rows.map((r) => toScorecard(r as MemoryRow));

    if (opts.vendorId) {
      scorecards = scorecards.filter((s) => s.vendorId === opts.vendorId);
    }
    if (opts.period) {
      scorecards = scorecards.filter((s) => s.period === opts.period);
    }
    if (opts.grade) {
      scorecards = scorecards.filter((s) => s.grade === opts.grade);
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      scorecards = scorecards.filter(
        (s) =>
          s.vendorName.toLowerCase().includes(q) ||
          s.period.toLowerCase().includes(q) ||
          s.notes.toLowerCase().includes(q),
      );
    }

    return scorecards;
  },

  /**
   * Update a scorecard (recalculates overall and grade).
   */
  async update(
    id: string,
    input: UpdateScorecardInput,
  ): Promise<SupplierScorecard | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseScorecardContent(existing.content);
    if (input.vendorName !== undefined) content.vendorName = input.vendorName;
    if (input.period !== undefined) content.period = input.period;
    if (input.qualityScore !== undefined) content.qualityScore = input.qualityScore;
    if (input.deliveryScore !== undefined) content.deliveryScore = input.deliveryScore;
    if (input.costScore !== undefined) content.costScore = input.costScore;
    if (input.serviceScore !== undefined) content.serviceScore = input.serviceScore;
    if (input.complianceScore !== undefined) content.complianceScore = input.complianceScore;
    if (input.notes !== undefined) content.notes = input.notes;

    content.overallScore = calcOverallScore(content);
    content.grade = calcGrade(content.overallScore);

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['supplier_scorecard', content.grade]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toScorecard(row as MemoryRow);
  },

  /**
   * Delete a scorecard.
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
   * Get all scorecards for a vendor.
   */
  async getByVendor(vendorId: string): Promise<SupplierScorecard[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'supplier_scorecard' },
          orderBy: { createdAt: 'asc' },
          take: 1000,
        }),
      [],
    );

    return rows
      .map((r) => toScorecard(r as MemoryRow))
      .filter((s) => s.vendorId === vendorId);
  },

  /**
   * Get top-rated suppliers (highest overall score).
   */
  async getTopSuppliers(
    organizationId: string,
    limit = 10,
  ): Promise<SupplierScorecard[]> {
    const scorecards = await SupplierScorecardService.list(organizationId);
    // Keep the latest scorecard per vendor
    const byVendor: Record<string, SupplierScorecard> = {};
    for (const s of scorecards) {
      byVendor[s.vendorId] = s; // list is desc by createdAt, so first wins
    }
    return Object.values(byVendor)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  },

  /**
   * Get lowest-rated suppliers.
   */
  async getBottomSuppliers(
    organizationId: string,
    limit = 10,
  ): Promise<SupplierScorecard[]> {
    const scorecards = await SupplierScorecardService.list(organizationId);
    const byVendor: Record<string, SupplierScorecard> = {};
    for (const s of scorecards) {
      byVendor[s.vendorId] = s;
    }
    return Object.values(byVendor)
      .sort((a, b) => a.overallScore - b.overallScore)
      .slice(0, limit);
  },

  /**
   * Get score trend over time for a vendor (chronological).
   */
  async getScoreTrend(vendorId: string): Promise<SupplierScorecard[]> {
    const scorecards = await SupplierScorecardService.getByVendor(vendorId);
    return scorecards.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  },

  /**
   * Get grade distribution (count by grade).
   */
  async getGradeDistribution(
    organizationId: string,
  ): Promise<Record<SupplierGrade, number>> {
    const scorecards = await SupplierScorecardService.list(organizationId);
    const dist: Record<SupplierGrade, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };
    for (const s of scorecards) {
      dist[s.grade] = (dist[s.grade] || 0) + 1;
    }
    return dist;
  },

  /**
   * Get stats for an organization.
   */
  async getStats(organizationId: string): Promise<ScorecardStats> {
    const scorecards = await SupplierScorecardService.list(organizationId);
    const gradeDistribution = await SupplierScorecardService.getGradeDistribution(
      organizationId,
    );
    const total = scorecards.length;
    const avg =
      total > 0
        ? Math.round(
            (scorecards.reduce((sum, s) => sum + s.overallScore, 0) / total) *
              100,
          ) / 100
        : 0;
    return {
      totalScorecards: total,
      avgScore: avg,
      gradeDistribution,
    };
  },
};
