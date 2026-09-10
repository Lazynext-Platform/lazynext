import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

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

/** Parsed content payload for a vendor performance Memory. */
interface PerformanceContent {
  vendorId: string;
  rating: number;
  qualityScore: number;
  deliveryScore: number;
  costScore: number;
  serviceScore: number;
  overallScore: number;
  comments: string;
  reviewDate: string;
  reviewerId: string;
}

/** A structured vendor performance review returned to callers. */
export interface VendorPerformance {
  id: string;
  organizationId: string;
  workspaceId: string;
  vendorId: string;
  rating: number;
  qualityScore: number;
  deliveryScore: number;
  costScore: number;
  serviceScore: number;
  overallScore: number;
  comments: string;
  reviewDate: Date;
  reviewerId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePerformanceInput {
  vendorId: string;
  rating: number;
  qualityScore?: number;
  deliveryScore?: number;
  costScore?: number;
  serviceScore?: number;
  comments?: string;
  reviewDate?: string;
  reviewerId?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface ListPerformanceOpts {
  vendorId?: string;
  dateRange?: { start?: string; end?: string };
  minRating?: number;
}

export interface PerformanceStats {
  totalReviews: number;
  avgRating: number;
  avgOverallScore: number;
  distribution: Record<number, number>;
}

// ── Helpers ──

const fallbackContent: PerformanceContent = {
  vendorId: '',
  rating: 0,
  qualityScore: 0,
  deliveryScore: 0,
  costScore: 0,
  serviceScore: 0,
  overallScore: 0,
  comments: '',
  reviewDate: '',
  reviewerId: '',
};

function parsePerformanceContent(raw: string): PerformanceContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      vendorId: parsed.vendorId ?? '',
      rating: Number(parsed.rating) || 0,
      qualityScore: parsed.qualityScore != null ? Number(parsed.qualityScore) : 0,
      deliveryScore: parsed.deliveryScore != null ? Number(parsed.deliveryScore) : 0,
      costScore: parsed.costScore != null ? Number(parsed.costScore) : 0,
      serviceScore: parsed.serviceScore != null ? Number(parsed.serviceScore) : 0,
      overallScore: Number(parsed.overallScore) || 0,
      comments: parsed.comments ?? '',
      reviewDate: parsed.reviewDate ?? '',
      reviewerId: parsed.reviewerId ?? '',
    };
  } catch {
    return fallbackContent;
  }
}

function toPerformance(row: MemoryRow): VendorPerformance {
  const content = parsePerformanceContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    vendorId: content.vendorId,
    rating: content.rating,
    qualityScore: content.qualityScore,
    deliveryScore: content.deliveryScore,
    costScore: content.costScore,
    serviceScore: content.serviceScore,
    overallScore: content.overallScore,
    comments: content.comments,
    reviewDate: content.reviewDate ? new Date(content.reviewDate) : new Date(0),
    reviewerId: content.reviewerId,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function calcOverallScore(input: CreatePerformanceInput): number {
  const scores: number[] = [];
  if (input.qualityScore != null) scores.push(input.qualityScore);
  if (input.deliveryScore != null) scores.push(input.deliveryScore);
  if (input.costScore != null) scores.push(input.costScore);
  if (input.serviceScore != null) scores.push(input.serviceScore);
  if (scores.length === 0) return input.rating;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ── Vendor Performance Service ──

export const VendorPerformanceService = {
  /**
   * Create a performance review. Stored as a Memory with type='vendor_performance'.
   */
  async create(organizationId: string, input: CreatePerformanceInput): Promise<VendorPerformance> {
    const overallScore = calcOverallScore(input);
    const reviewDate = input.reviewDate ?? new Date().toISOString();
    const content: PerformanceContent = {
      vendorId: input.vendorId,
      rating: input.rating,
      qualityScore: input.qualityScore ?? 0,
      deliveryScore: input.deliveryScore ?? 0,
      costScore: input.costScore ?? 0,
      serviceScore: input.serviceScore ?? 0,
      overallScore,
      comments: input.comments ?? '',
      reviewDate,
      reviewerId: input.reviewerId ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'vendor_performance',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.vendorId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['vendor_performance', `rating_${input.rating}`]),
        createdBy: input.createdBy,
      },
    });

    return toPerformance(row as MemoryRow);
  },

  /**
   * Get a single performance review by ID.
   */
  async get(id: string): Promise<VendorPerformance | null> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toPerformance(row as MemoryRow);
  },

  /**
   * List performance reviews for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListPerformanceOpts = {}): Promise<VendorPerformance[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'vendor_performance',
          organizationId,
          ...(opts.vendorId ? { sourceId: opts.vendorId } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
      [],
    );

    let reviews = rows.map((r) => toPerformance(r as MemoryRow));

    if (opts.minRating != null) {
      reviews = reviews.filter((r) => r.rating >= opts.minRating!);
    }
    if (opts.dateRange) {
      if (opts.dateRange.start) {
        const start = new Date(opts.dateRange.start);
        reviews = reviews.filter((r) => r.reviewDate >= start);
      }
      if (opts.dateRange.end) {
        const end = new Date(opts.dateRange.end);
        reviews = reviews.filter((r) => r.reviewDate <= end);
      }
    }

    return reviews;
  },

  /**
   * Get all performance reviews for a vendor.
   */
  async getByVendor(vendorId: string): Promise<VendorPerformance[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'vendor_performance',
          sourceId: vendorId,
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
      [],
    );
    return rows.map((r) => toPerformance(r as MemoryRow));
  },

  /**
   * Get the average performance score for a vendor.
   */
  async getAverageScore(vendorId: string): Promise<number> {
    const reviews = await VendorPerformanceService.getByVendor(vendorId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.overallScore, 0);
    return sum / reviews.length;
  },

  /**
   * Get top-performing vendors in an organization.
   */
  async getTopPerformers(organizationId: string, limit = 10): Promise<{ vendorId: string; avgScore: number; reviewCount: number }[]> {
    const reviews = await VendorPerformanceService.list(organizationId);
    const byVendor: Record<string, number[]> = {};
    for (const r of reviews) {
      if (!byVendor[r.vendorId]) byVendor[r.vendorId] = [];
      byVendor[r.vendorId].push(r.overallScore);
    }
    const result = Object.entries(byVendor).map(([vendorId, scores]) => ({
      vendorId,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      reviewCount: scores.length,
    }));
    result.sort((a, b) => b.avgScore - a.avgScore);
    return result.slice(0, limit);
  },

  /**
   * Get lowest-performing vendors in an organization.
   */
  async getBottomPerformers(organizationId: string, limit = 10): Promise<{ vendorId: string; avgScore: number; reviewCount: number }[]> {
    const top = await VendorPerformanceService.getTopPerformers(organizationId, 10000);
    return top.slice(-limit).reverse();
  },

  /**
   * Get performance stats for an organization.
   */
  async getStats(organizationId: string): Promise<PerformanceStats> {
    const reviews = await VendorPerformanceService.list(organizationId);
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    let scoreSum = 0;
    for (const r of reviews) {
      const key = Math.max(1, Math.min(5, Math.round(r.rating)));
      distribution[key] = (distribution[key] || 0) + 1;
      ratingSum += r.rating;
      scoreSum += r.overallScore;
    }
    return {
      totalReviews: reviews.length,
      avgRating: reviews.length > 0 ? ratingSum / reviews.length : 0,
      avgOverallScore: reviews.length > 0 ? scoreSum / reviews.length : 0,
      distribution,
    };
  },
};
