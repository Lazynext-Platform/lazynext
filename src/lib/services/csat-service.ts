import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type CsatScale = '1-5' | '1-10' | 'emoji';

export interface CsatSurveyData {
  name: string;
  question: string;
  scale: CsatScale;
  status?: 'active' | 'paused' | 'closed';
  responseCount?: number;
}

export interface CsatResponseData {
  surveyId: string;
  score: number;
  comment?: string;
  customerId?: string;
  ticketId?: string;
  respondentName?: string;
}

export interface CsatScore {
  score: number;
  totalResponses: number;
  satisfied: number;
  neutral: number;
  unsatisfied: number;
  avgScore: number;
}

export interface CsatTrendPoint {
  month: string;
  score: number;
  totalResponses: number;
}

export interface CsatStats {
  totalSurveys: number;
  totalResponses: number;
  avgCsat: number;
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

function parseSurvey(mem: {
  id: string;
  content: string;
  tags: string;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  organizationId: string;
  createdBy: string;
}): CsatSurveyData & { id: string; workspaceId: string; organizationId: string; createdBy: string; tags: string[]; createdAt: Date; updatedAt: Date } {
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
  } as CsatSurveyData & { id: string; workspaceId: string; organizationId: string; createdBy: string; tags: string[]; createdAt: Date; updatedAt: Date };
}

function parseResponse(mem: {
  id: string;
  content: string;
  tags: string;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  organizationId: string;
  createdBy: string;
}): CsatResponseData & { id: string; createdAt: Date; updatedAt: Date } {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(mem.content);
  } catch {
    data = {};
  }
  return {
    ...data,
    id: mem.id,
    createdAt: mem.createdAt,
    updatedAt: mem.updatedAt,
  } as CsatResponseData & { id: string; createdAt: Date; updatedAt: Date };
}

function getMaxScore(scale: CsatScale): number {
  if (scale === '1-5') return 5;
  if (scale === '1-10') return 10;
  return 5; // emoji maps to 1-5
}

// ── CSAT Service ──

export const CsatService = {
  /**
   * Create a new CSAT survey stored as a Memory record.
   */
  async createSurvey(organizationId: string, input: {
    name: string;
    question?: string;
    scale?: CsatScale;
    workspaceId?: string;
    createdBy: string;
  }) {
    const scale = input.scale || '1-5';
    const content = JSON.stringify({
      name: input.name.slice(0, 300),
      question: input.question || 'How satisfied are you with your experience?',
      scale,
      status: 'active',
      responseCount: 0,
    });
    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'csat_survey',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: input.createdBy,
        confidence: 0.9,
        owner: input.createdBy,
        lifecycle: 'long',
        tags: JSON.stringify(['csat_survey']),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * Get a single CSAT survey by ID.
   */
  async getSurvey(id: string) {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!mem || mem.type !== 'csat_survey') return null;
    return parseSurvey(mem);
  },

  /**
   * List all CSAT surveys for an organization.
   */
  async listSurveys(organizationId: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { organizationId, type: 'csat_survey' },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
      [],
    );
    return memories.map(parseSurvey);
  },

  /**
   * Delete a CSAT survey and its responses.
   */
  async deleteSurvey(id: string) {
    await safePrisma(() =>
      prisma.memory.deleteMany({
        where: { type: 'csat_response', sourceId: id },
      }),
      { count: 0 } as { count: number },
    );
    return prisma.memory.delete({ where: { id } });
  },

  /**
   * Submit a CSAT response.
   */
  async submitResponse(surveyId: string, input: {
    score: number;
    comment?: string;
    customerId?: string;
    ticketId?: string;
    respondentName?: string;
  }) {
    const survey = await this.getSurvey(surveyId);
    if (!survey) throw new Error('CSAT survey not found');

    const maxScore = getMaxScore(survey.scale);
    const score = Math.max(1, Math.min(maxScore, Math.round(input.score)));
    const content = JSON.stringify({
      surveyId,
      score,
      comment: input.comment || '',
      customerId: input.customerId || null,
      ticketId: input.ticketId || null,
      respondentName: input.respondentName || '',
    });

    return prisma.memory.create({
      data: {
        workspaceId: survey.workspaceId,
        organizationId: survey.organizationId,
        type: 'csat_response',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: surveyId,
        confidence: 0.9,
        owner: input.customerId || null,
        lifecycle: 'long',
        tags: JSON.stringify(['csat_response']),
        createdBy: input.customerId || 'anonymous',
      },
    });
  },

  /**
   * List responses for a survey with optional filters.
   */
  async getResponses(surveyId: string, opts?: {
    scoreRange?: [number, number];
    dateRange?: [Date, Date];
  }) {
    const where: Record<string, unknown> = {
      type: 'csat_response',
      sourceId: surveyId,
    };
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
        take: 1000,
      }),
      [],
    );

    let responses = memories.map(parseResponse);
    if (opts?.scoreRange) {
      const [min, max] = opts.scoreRange;
      responses = responses.filter((r) => r.score >= min && r.score <= max);
    }
    return responses;
  },

  /**
   * Calculate the CSAT score for a survey.
   * For 1-5 scale: % of 4-5 ratings (satisfied)
   * For 1-10 scale: % of 8-10 ratings (satisfied)
   */
  async getScore(surveyId: string, opts?: {
    dateRange?: [Date, Date];
  }): Promise<CsatScore> {
    const survey = await this.getSurvey(surveyId);
    const scale = survey?.scale || '1-5';
    const responses = await this.getResponses(surveyId, opts);
    const total = responses.length;
    if (total === 0) {
      return {
        score: 0,
        totalResponses: 0,
        satisfied: 0,
        neutral: 0,
        unsatisfied: 0,
        avgScore: 0,
      };
    }

    // Satisfied thresholds
    const satisfiedThreshold = scale === '1-10' ? 8 : 4;
    const neutralThreshold = scale === '1-10' ? 6 : 3;

    let satisfied = 0;
    let neutral = 0;
    let unsatisfied = 0;
    let totalScore = 0;

    for (const r of responses) {
      totalScore += r.score;
      if (r.score >= satisfiedThreshold) satisfied++;
      else if (r.score >= neutralThreshold) neutral++;
      else unsatisfied++;
    }

    const score = Math.round((satisfied / total) * 100);
    const avgScore = Math.round((totalScore / total) * 10) / 10;

    return {
      score,
      totalResponses: total,
      satisfied,
      neutral,
      unsatisfied,
      avgScore,
    };
  },

  /**
   * Get CSAT score trend over time (monthly buckets).
   */
  async getTrend(surveyId: string, opts?: {
    dateRange?: [Date, Date];
  }): Promise<CsatTrendPoint[]> {
    const survey = await this.getSurvey(surveyId);
    const scale = survey?.scale || '1-5';
    const responses = await this.getResponses(surveyId, opts);

    const buckets: Record<string, { scores: number[]; count: number }> = {};
    for (const r of responses) {
      const d = new Date(r.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[monthKey]) {
        buckets[monthKey] = { scores: [], count: 0 };
      }
      buckets[monthKey].scores.push(r.score);
      buckets[monthKey].count++;
    }

    const satisfiedThreshold = scale === '1-10' ? 8 : 4;
    const trend: CsatTrendPoint[] = [];
    const sortedMonths = Object.keys(buckets).sort();
    for (const month of sortedMonths) {
      const bucket = buckets[month];
      const total = bucket.count;
      let satisfied = 0;
      for (const score of bucket.scores) {
        if (score >= satisfiedThreshold) satisfied++;
      }
      const score = Math.round((satisfied / total) * 100);
      trend.push({ month, score, totalResponses: total });
    }
    return trend;
  },

  /**
   * Get CSAT stats for an organization.
   */
  async getStats(organizationId: string): Promise<CsatStats> {
    const surveys = await this.listSurveys(organizationId);
    const totalSurveys = surveys.length;

    let totalResponses = 0;
    const scores: number[] = [];

    for (const survey of surveys) {
      const score = await this.getScore(survey.id);
      totalResponses += score.totalResponses;
      if (score.totalResponses > 0) {
        scores.push(score.score);
      }
    }

    const avgCsat = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    return {
      totalSurveys,
      totalResponses,
      avgCsat,
    };
  },
};
