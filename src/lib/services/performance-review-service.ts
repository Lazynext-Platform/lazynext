import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface ReviewGoal {
  title: string;
  achievement?: string;
  score?: number;
}

export interface ReviewCompetency {
  name: string;
  rating?: number;
  comment?: string;
}

export interface ReviewFilters {
  employeeId?: string;
  reviewerId?: string;
  status?: string;
  period?: string;
}

// ── Helpers ──

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[]';
  }
}

// ── Performance Review Service ──

export const PerformanceReviewService = {
  /**
   * Create a new performance review.
   */
  async create(input: {
    organizationId: string;
    employeeId: string;
    reviewerId: string;
    reviewPeriod?: string;
    type?: string;
    goals?: ReviewGoal[];
    competencies?: ReviewCompetency[];
    overallRating?: number;
    strengths?: string;
    improvements?: string;
    comments?: string;
  }) {
    return prisma.performanceReview.create({
      data: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        reviewerId: input.reviewerId,
        reviewPeriod: input.reviewPeriod || '',
        type: input.type || 'annual',
        status: 'draft',
        goals: serializeJson(input.goals || []),
        competencies: serializeJson(input.competencies || []),
        overallRating: input.overallRating ?? null,
        strengths: input.strengths || '',
        improvements: input.improvements || '',
        comments: input.comments || '',
      },
    });
  },

  /**
   * Get a single performance review by ID.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.performanceReview.findUnique({
        where: { id },
      }),
    null);
  },

  /**
   * List performance reviews with optional filters.
   */
  async list(organizationId: string, filters?: ReviewFilters) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.reviewerId) where.reviewerId = filters.reviewerId;
    if (filters?.status) where.status = filters.status;
    if (filters?.period) where.reviewPeriod = filters.period;
    return safePrisma(() =>
      prisma.performanceReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Update a performance review.
   */
  async update(id: string, data: {
    reviewPeriod?: string;
    type?: string;
    goals?: ReviewGoal[];
    competencies?: ReviewCompetency[];
    overallRating?: number;
    strengths?: string;
    improvements?: string;
    comments?: string;
    reviewerComments?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.reviewPeriod !== undefined) updateData.reviewPeriod = data.reviewPeriod;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.goals !== undefined) updateData.goals = serializeJson(data.goals);
    if (data.competencies !== undefined) updateData.competencies = serializeJson(data.competencies);
    if (data.overallRating !== undefined) updateData.overallRating = data.overallRating;
    if (data.strengths !== undefined) updateData.strengths = data.strengths;
    if (data.improvements !== undefined) updateData.improvements = data.improvements;
    if (data.comments !== undefined) updateData.comments = data.comments;
    if (data.reviewerComments !== undefined) updateData.reviewerComments = data.reviewerComments;

    return prisma.performanceReview.update({ where: { id }, data: updateData });
  },

  /**
   * Submit a review (transition from draft/in_progress to submitted).
   */
  async submit(id: string) {
    return prisma.performanceReview.update({
      where: { id },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
      },
    });
  },

  /**
   * Complete a review (transition to completed).
   */
  async complete(id: string) {
    return prisma.performanceReview.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
  },

  /**
   * Delete a performance review.
   */
  async delete(id: string) {
    return prisma.performanceReview.delete({ where: { id } });
  },

  /**
   * Get all reviews for a specific employee.
   */
  async getByEmployee(employeeId: string) {
    return safePrisma(() =>
      prisma.performanceReview.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get all reviews assigned to a specific reviewer.
   */
  async getByReviewer(reviewerId: string) {
    return safePrisma(() =>
      prisma.performanceReview.findMany({
        where: { reviewerId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get the goals array from a review (parsed from JSON).
   */
  async getGoals(id: string): Promise<ReviewGoal[]> {
    const review = await safePrisma(() =>
      prisma.performanceReview.findUnique({
        where: { id },
        select: { goals: true },
      }),
    null);
    if (!review) return [];
    return parseJson<ReviewGoal[]>(review.goals, []);
  },

  /**
   * Add a goal to a review's goals array.
   */
  async addGoal(id: string, goal: ReviewGoal) {
    const review = await prisma.performanceReview.findUnique({ where: { id }, select: { goals: true } });
    if (!review) throw new Error('Review not found');
    const goals = parseJson<ReviewGoal[]>(review.goals, []);
    goals.push(goal);
    return prisma.performanceReview.update({
      where: { id },
      data: { goals: serializeJson(goals) },
    });
  },

  /**
   * Get the competencies array from a review (parsed from JSON).
   */
  async getCompetencies(id: string): Promise<ReviewCompetency[]> {
    const review = await safePrisma(() =>
      prisma.performanceReview.findUnique({
        where: { id },
        select: { competencies: true },
      }),
    null);
    if (!review) return [];
    return parseJson<ReviewCompetency[]>(review.competencies, []);
  },

  /**
   * Add a competency to a review's competencies array.
   */
  async addCompetency(id: string, competency: ReviewCompetency) {
    const review = await prisma.performanceReview.findUnique({ where: { id }, select: { competencies: true } });
    if (!review) throw new Error('Review not found');
    const competencies = parseJson<ReviewCompetency[]>(review.competencies, []);
    competencies.push(competency);
    return prisma.performanceReview.update({
      where: { id },
      data: { competencies: serializeJson(competencies) },
    });
  },

  /**
   * Get aggregate stats for performance reviews in an organization.
   */
  async getStats(organizationId: string) {
    const reviews = await safePrisma(() =>
      prisma.performanceReview.findMany({
        where: { organizationId },
        select: { status: true, type: true, overallRating: true, reviewPeriod: true },
      }),
    []);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byPeriod: Record<string, number> = {};
    let ratingSum = 0;
    let ratingCount = 0;

    for (const r of reviews) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byType[r.type] = (byType[r.type] || 0) + 1;
      byPeriod[r.reviewPeriod] = (byPeriod[r.reviewPeriod] || 0) + 1;
      if (r.overallRating != null) {
        ratingSum += r.overallRating;
        ratingCount += 1;
      }
    }

    return {
      total: reviews.length,
      draft: byStatus['draft'] || 0,
      inProgress: byStatus['in_progress'] || 0,
      submitted: byStatus['submitted'] || 0,
      completed: byStatus['completed'] || 0,
      byStatus,
      byType,
      byPeriod,
      averageRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
    };
  },

  /**
   * Get rating trends across review periods.
   */
  async getTrends(organizationId: string) {
    const reviews = await safePrisma(() =>
      prisma.performanceReview.findMany({
        where: { organizationId, overallRating: { not: null } },
        select: { reviewPeriod: true, overallRating: true, type: true },
        orderBy: { reviewPeriod: 'asc' },
      }),
    []);

    const byPeriod: Record<string, { ratings: number[]; count: number }> = {};
    for (const r of reviews) {
      const period = r.reviewPeriod || 'unknown';
      if (!byPeriod[period]) byPeriod[period] = { ratings: [], count: 0 };
      byPeriod[period].ratings.push(r.overallRating as number);
      byPeriod[period].count += 1;
    }

    const trends = Object.entries(byPeriod)
      .map(([period, data]) => ({
        period,
        averageRating: data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length,
        count: data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return trends;
  },
};
