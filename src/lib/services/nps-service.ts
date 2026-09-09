import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface NpsSurveyData {
  name: string;
  question: string;
  followUpQuestion: string;
  status?: 'active' | 'paused' | 'closed';
  responseCount?: number;
}

export interface NpsResponseData {
  surveyId: string;
  score: number;
  comment?: string;
  customerId?: string;
  respondentName?: string;
  respondentEmail?: string;
}

export interface NpsScore {
  score: number;
  promoterCount: number;
  detractorCount: number;
  passiveCount: number;
  totalResponses: number;
  promoterPercent: number;
  detractorPercent: number;
}

export interface NpsTrendPoint {
  month: string;
  score: number;
  totalResponses: number;
}

export interface NpsStats {
  totalSurveys: number;
  totalResponses: number;
  avgNps: number;
  responseRate: number;
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
}): NpsSurveyData & { id: string; workspaceId: string; organizationId: string; createdBy: string; tags: string[]; createdAt: Date; updatedAt: Date } {
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
  } as NpsSurveyData & { id: string; workspaceId: string; organizationId: string; createdBy: string; tags: string[]; createdAt: Date; updatedAt: Date };
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
}): NpsResponseData & { id: string; createdAt: Date; updatedAt: Date } {
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
  } as NpsResponseData & { id: string; createdAt: Date; updatedAt: Date };
}

// ── NPS Service ──

export const NpsService = {
  /**
   * Create a new NPS survey stored as a Memory record.
   */
  async createSurvey(organizationId: string, input: {
    name: string;
    question?: string;
    followUpQuestion?: string;
    workspaceId?: string;
    createdBy: string;
  }) {
    const content = JSON.stringify({
      name: input.name.slice(0, 300),
      question: input.question || 'How likely are you to recommend us to a friend or colleague?',
      followUpQuestion: input.followUpQuestion || 'What is the primary reason for your score?',
      status: 'active',
      responseCount: 0,
    });
    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'nps_survey',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: input.createdBy,
        confidence: 0.9,
        owner: input.createdBy,
        lifecycle: 'long',
        tags: JSON.stringify(['nps_survey']),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * Get a single NPS survey by ID.
   */
  async getSurvey(id: string) {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!mem || mem.type !== 'nps_survey') return null;
    return parseSurvey(mem);
  },

  /**
   * List all NPS surveys for an organization.
   */
  async listSurveys(organizationId: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { organizationId, type: 'nps_survey' },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
      [],
    );
    return memories.map(parseSurvey);
  },

  /**
   * Update an NPS survey.
   */
  async updateSurvey(id: string, input: {
    name?: string;
    question?: string;
    followUpQuestion?: string;
    status?: 'active' | 'paused' | 'closed';
  }) {
    const existing = await this.getSurvey(id);
    if (!existing) throw new Error('NPS survey not found');

    const merged: NpsSurveyData = {
      name: existing.name,
      question: existing.question,
      followUpQuestion: existing.followUpQuestion,
      status: existing.status || 'active',
      responseCount: existing.responseCount || 0,
    };

    if (input.name !== undefined) merged.name = input.name.slice(0, 300);
    if (input.question !== undefined) merged.question = input.question;
    if (input.followUpQuestion !== undefined) merged.followUpQuestion = input.followUpQuestion;
    if (input.status !== undefined) merged.status = input.status;

    const content = JSON.stringify(merged);
    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
      },
    });
  },

  /**
   * Delete an NPS survey and its responses.
   */
  async deleteSurvey(id: string) {
    // Delete responses first
    await safePrisma(() =>
      prisma.memory.deleteMany({
        where: { type: 'nps_response', sourceId: id },
      }),
      { count: 0 } as { count: number },
    );
    return prisma.memory.delete({ where: { id } });
  },

  /**
   * Submit an NPS response.
   */
  async submitResponse(surveyId: string, input: {
    score: number;
    comment?: string;
    customerId?: string;
    respondentName?: string;
    respondentEmail?: string;
  }) {
    const survey = await this.getSurvey(surveyId);
    if (!survey) throw new Error('NPS survey not found');

    const score = Math.max(0, Math.min(10, Math.round(input.score)));
    const content = JSON.stringify({
      surveyId,
      score,
      comment: input.comment || '',
      customerId: input.customerId || null,
      respondentName: input.respondentName || '',
      respondentEmail: input.respondentEmail || '',
    });

    return prisma.memory.create({
      data: {
        workspaceId: survey.workspaceId,
        organizationId: survey.organizationId,
        type: 'nps_response',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: surveyId,
        confidence: 0.9,
        owner: input.customerId || null,
        lifecycle: 'long',
        tags: JSON.stringify(['nps_response']),
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
      type: 'nps_response',
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
   * Calculate the NPS score for a survey.
   */
  async getScore(surveyId: string, opts?: {
    dateRange?: [Date, Date];
  }): Promise<NpsScore> {
    const responses = await this.getResponses(surveyId, opts);
    const total = responses.length;
    if (total === 0) {
      return {
        score: 0,
        promoterCount: 0,
        detractorCount: 0,
        passiveCount: 0,
        totalResponses: 0,
        promoterPercent: 0,
        detractorPercent: 0,
      };
    }

    let promoters = 0;
    let detractors = 0;
    let passives = 0;

    for (const r of responses) {
      if (r.score >= 9) promoters++;
      else if (r.score <= 6) detractors++;
      else passives++;
    }

    const promoterPercent = (promoters / total) * 100;
    const detractorPercent = (detractors / total) * 100;
    const score = Math.round(promoterPercent - detractorPercent);

    return {
      score,
      promoterCount: promoters,
      detractorCount: detractors,
      passiveCount: passives,
      totalResponses: total,
      promoterPercent: Math.round(promoterPercent * 10) / 10,
      detractorPercent: Math.round(detractorPercent * 10) / 10,
    };
  },

  /**
   * Get NPS score trend over time (monthly buckets).
   */
  async getTrend(surveyId: string, opts?: {
    dateRange?: [Date, Date];
  }): Promise<NpsTrendPoint[]> {
    const responses = await this.getResponses(surveyId, opts);

    // Group by month
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

    // Calculate NPS per month
    const trend: NpsTrendPoint[] = [];
    const sortedMonths = Object.keys(buckets).sort();
    for (const month of sortedMonths) {
      const bucket = buckets[month];
      const total = bucket.count;
      let promoters = 0;
      let detractors = 0;
      for (const score of bucket.scores) {
        if (score >= 9) promoters++;
        else if (score <= 6) detractors++;
      }
      const promoterPercent = (promoters / total) * 100;
      const detractorPercent = (detractors / total) * 100;
      const score = Math.round(promoterPercent - detractorPercent);
      trend.push({ month, score, totalResponses: total });
    }
    return trend;
  },

  /**
   * Get NPS stats for an organization.
   */
  async getStats(organizationId: string): Promise<NpsStats> {
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

    const avgNps = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const responseRate = totalSurveys > 0
      ? Math.round((totalResponses / totalSurveys) * 100) / 100
      : 0;

    return {
      totalSurveys,
      totalResponses,
      avgNps,
      responseRate,
    };
  },
};
