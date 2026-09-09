import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type FeedbackSource = 'form' | 'email' | 'api' | 'import';
export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface FeedbackData {
  source: FeedbackSource;
  content: string;
  rating?: number;
  customerId?: string;
  category?: string;
  tags?: string[];
  submittedBy?: string;
  response?: string;
  respondedBy?: string;
  respondedAt?: string;
  sentiment?: Sentiment;
  sentimentScore?: number;
}

export interface SentimentResult {
  sentiment: Sentiment;
  score: number;
  keywords: string[];
}

export interface SentimentTrendPoint {
  month: string;
  positive: number;
  negative: number;
  neutral: number;
  avgScore: number;
}

export interface FeedbackStats {
  total: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  avgRating: number;
  sentimentBreakdown: { positive: number; negative: number; neutral: number };
}

// ── Sentiment Analysis ──

const POSITIVE_WORDS = [
  'great', 'excellent', 'amazing', 'love', 'perfect', 'awesome', 'fantastic',
  'wonderful', 'good', 'best', 'happy', 'satisfied', 'pleased', 'delighted',
  'outstanding', 'superb', 'brilliant', 'recommend', 'helpful', 'easy',
  'fast', 'reliable', 'quality', 'impressed', 'enjoy', 'smooth', 'intuitive',
  'efficient', 'valuable', 'improved', 'success', 'thank', 'appreciate',
];

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'poor', 'slow',
  'broken', 'bug', 'crash', 'fail', 'disappointed', 'frustrated', 'angry',
  'confusing', 'difficult', 'useless', 'waste', 'expensive', 'unreliable',
  'issue', 'problem', 'error', 'wrong', 'missing', 'lack', 'complicated',
  'unhappy', 'dissatisfied', 'frustrating', 'annoying', 'overpriced', 'rude',
  'delayed', 'unresponsive', 'incompetent', 'regret', 'cancel',
];

function analyzeSentiment(text: string): SentimentResult {
  const lowerText = text.toLowerCase();
  const words = lowerText.match(/\b\w+\b/g) || [];

  let positiveCount = 0;
  let negativeCount = 0;
  const keywords: string[] = [];

  for (const word of words) {
    if (POSITIVE_WORDS.includes(word)) {
      positiveCount++;
      if (!keywords.includes(word)) keywords.push(word);
    } else if (NEGATIVE_WORDS.includes(word)) {
      negativeCount++;
      if (!keywords.includes(word)) keywords.push(word);
    }
  }

  const total = positiveCount + negativeCount;
  let score: number;
  let sentiment: Sentiment;

  if (total === 0) {
    score = 0;
    sentiment = 'neutral';
  } else {
    score = (positiveCount - negativeCount) / total;
    if (score > 0.15) sentiment = 'positive';
    else if (score < -0.15) sentiment = 'negative';
    else sentiment = 'neutral';
  }

  return { sentiment, score: Math.round(score * 100) / 100, keywords };
}

// ── Helpers ──

function safeParseArray(s: string): string[] {
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function parseFeedback(mem: {
  id: string;
  content: string;
  tags: string;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  organizationId: string;
  createdBy: string;
}): FeedbackData & { id: string; workspaceId: string; organizationId: string; createdBy: string; tags: string[]; createdAt: Date; updatedAt: Date } {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(mem.content);
  } catch {
    data = {};
  }
  return {
    ...data,
    id: mem.id,
    workspaceId: mem.workspaceId,
    organizationId: mem.organizationId,
    createdBy: mem.createdBy,
    tags: safeParseArray(mem.tags),
    createdAt: mem.createdAt,
    updatedAt: mem.updatedAt,
  } as FeedbackData & { id: string; workspaceId: string; organizationId: string; createdBy: string; tags: string[]; createdAt: Date; updatedAt: Date };
}

// ── Feedback Service ──

export const FeedbackService = {
  /**
   * Collect new feedback.
   */
  async create(organizationId: string, input: {
    source: FeedbackSource;
    content: string;
    rating?: number;
    customerId?: string;
    category?: string;
    tags?: string[];
    submittedBy?: string;
    workspaceId?: string;
  }) {
    const sentimentResult = analyzeSentiment(input.content);
    const content = JSON.stringify({
      source: input.source,
      content: input.content.slice(0, 8000),
      rating: input.rating ?? null,
      customerId: input.customerId || null,
      category: input.category || 'general',
      tags: input.tags || [],
      submittedBy: input.submittedBy || 'anonymous',
      response: null,
      respondedBy: null,
      respondedAt: null,
      sentiment: sentimentResult.sentiment,
      sentimentScore: sentimentResult.score,
    });

    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'customer_feedback',
        content: content.slice(0, 10000),
        source: input.source,
        sourceId: input.customerId || null,
        confidence: 0.8,
        owner: input.customerId || null,
        lifecycle: 'long',
        tags: JSON.stringify(input.tags || ['customer_feedback']),
        createdBy: input.submittedBy || 'anonymous',
      },
    });
  },

  /**
   * Get a single feedback entry by ID.
   */
  async get(id: string) {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!mem || mem.type !== 'customer_feedback') return null;
    return parseFeedback(mem);
  },

  /**
   * List feedback with filters.
   */
  async list(organizationId: string, opts?: {
    category?: string;
    rating?: number;
    source?: FeedbackSource;
    dateRange?: [Date, Date];
    search?: string;
  }) {
    const where: Record<string, unknown> = {
      organizationId,
      type: 'customer_feedback',
    };
    if (opts?.source) where.source = opts.source;
    if (opts?.dateRange) {
      where.createdAt = {
        gte: opts.dateRange[0],
        lte: opts.dateRange[1],
      };
    }

    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      [],
    );

    let results = memories.map(parseFeedback);

    // Apply post-fetch filters
    if (opts?.category) {
      results = results.filter((r) => r.category === opts.category);
    }
    if (opts?.rating !== undefined) {
      results = results.filter((r) => r.rating === opts.rating);
    }
    if (opts?.search) {
      const searchLower = opts.search.toLowerCase();
      results = results.filter((r) =>
        r.content.toLowerCase().includes(searchLower),
      );
    }
    return results;
  },

  /**
   * Update feedback (add tags, category, response).
   */
  async update(id: string, input: {
    category?: string;
    tags?: string[];
    rating?: number;
  }) {
    const existing = await this.get(id);
    if (!existing) throw new Error('Feedback not found');

    const merged: FeedbackData = {
      source: existing.source,
      content: existing.content,
      rating: existing.rating ?? undefined,
      customerId: existing.customerId,
      category: existing.category || 'general',
      tags: existing.tags,
      submittedBy: existing.submittedBy,
      response: existing.response,
      respondedBy: existing.respondedBy,
      respondedAt: existing.respondedAt,
      sentiment: existing.sentiment,
      sentimentScore: existing.sentimentScore,
    };

    if (input.category !== undefined) merged.category = input.category;
    if (input.tags !== undefined) merged.tags = input.tags;
    if (input.rating !== undefined) merged.rating = input.rating;

    const content = JSON.stringify(merged);
    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
        tags: JSON.stringify(merged.tags || []),
      },
    });
  },

  /**
   * Delete feedback.
   */
  async delete(id: string) {
    return prisma.memory.delete({ where: { id } });
  },

  /**
   * Respond to feedback.
   */
  async respond(id: string, response: string, respondedBy: string) {
    const existing = await this.get(id);
    if (!existing) throw new Error('Feedback not found');

    const merged: FeedbackData = {
      source: existing.source,
      content: existing.content,
      rating: existing.rating ?? undefined,
      customerId: existing.customerId,
      category: existing.category || 'general',
      tags: existing.tags,
      submittedBy: existing.submittedBy,
      response: response.slice(0, 5000),
      respondedBy,
      respondedAt: new Date().toISOString(),
      sentiment: existing.sentiment,
      sentimentScore: existing.sentimentScore,
    };

    const content = JSON.stringify(merged);
    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
      },
    });
  },

  /**
   * Get feedback grouped by category.
   */
  async getByCategory(organizationId: string): Promise<Record<string, number>> {
    const all = await this.list(organizationId);
    const byCategory: Record<string, number> = {};
    for (const f of all) {
      const cat = f.category || 'general';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }
    return byCategory;
  },

  /**
   * Analyze sentiment of feedback text.
   */
  async getSentiment(feedbackId: string): Promise<SentimentResult | null> {
    const feedback = await this.get(feedbackId);
    if (!feedback) return null;
    return analyzeSentiment(feedback.content);
  },

  /**
   * Get sentiment trend over time (monthly buckets).
   */
  async getSentimentTrend(organizationId: string, opts?: {
    dateRange?: [Date, Date];
  }): Promise<SentimentTrendPoint[]> {
    const all = await this.list(organizationId, { dateRange: opts?.dateRange });

    const buckets: Record<string, { positive: number; negative: number; neutral: number; scores: number[] }> = {};
    for (const f of all) {
      const d = new Date(f.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[monthKey]) {
        buckets[monthKey] = { positive: 0, negative: 0, neutral: 0, scores: [] };
      }
      const sentiment = f.sentiment || 'neutral';
      const score = f.sentimentScore ?? 0;
      if (sentiment === 'positive') buckets[monthKey].positive++;
      else if (sentiment === 'negative') buckets[monthKey].negative++;
      else buckets[monthKey].neutral++;
      buckets[monthKey].scores.push(score);
    }

    const trend: SentimentTrendPoint[] = [];
    const sortedMonths = Object.keys(buckets).sort();
    for (const month of sortedMonths) {
      const bucket = buckets[month];
      const totalScores = bucket.scores.length;
      const avgScore = totalScores > 0
        ? Math.round((bucket.scores.reduce((a, b) => a + b, 0) / totalScores) * 100) / 100
        : 0;
      trend.push({
        month,
        positive: bucket.positive,
        negative: bucket.negative,
        neutral: bucket.neutral,
        avgScore,
      });
    }
    return trend;
  },

  /**
   * Get feedback stats for an organization.
   */
  async getStats(organizationId: string): Promise<FeedbackStats> {
    const all = await this.list(organizationId);

    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const sentimentBreakdown = { positive: 0, negative: 0, neutral: 0 };
    let totalRating = 0;
    let ratingCount = 0;

    for (const f of all) {
      bySource[f.source] = (bySource[f.source] || 0) + 1;
      const cat = f.category || 'general';
      byCategory[cat] = (byCategory[cat] || 0) + 1;

      const sentiment = f.sentiment || 'neutral';
      if (sentiment === 'positive') sentimentBreakdown.positive++;
      else if (sentiment === 'negative') sentimentBreakdown.negative++;
      else sentimentBreakdown.neutral++;

      if (f.rating !== undefined && f.rating !== null) {
        totalRating += f.rating;
        ratingCount++;
      }
    }

    const avgRating = ratingCount > 0
      ? Math.round((totalRating / ratingCount) * 10) / 10
      : 0;

    return {
      total: all.length,
      bySource,
      byCategory,
      avgRating,
      sentimentBreakdown,
    };
  },
};
