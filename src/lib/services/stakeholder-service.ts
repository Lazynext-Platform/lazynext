import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type StakeholderType = 'investor' | 'board_member' | 'executive' | 'employee' | 'customer' | 'partner' | 'regulator' | 'community' | 'media' | 'supplier' | 'other';
export type InfluenceLevel = 'low' | 'medium' | 'high' | 'very_high';
export type InterestLevel = 'low' | 'medium' | 'high' | 'very_high';
export type EngagementStrategy = 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor';
export type EngagementType = 'meeting' | 'call' | 'email' | 'presentation' | 'report' | 'event' | 'consultation' | 'other';
export type EngagementStatus = 'planned' | 'completed' | 'cancelled';
export type SentimentLevel = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
export type SentimentTrend = 'improving' | 'declining' | 'stable';
export type CommunicationChannel = 'email' | 'letter' | 'press_release' | 'social_media' | 'newsletter' | 'briefing' | 'other';
export type CommunicationStatus = 'draft' | 'sent' | 'responded' | 'archived';

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

interface StakeholderContent {
  name: string;
  type: StakeholderType;
  organization: string;
  role: string;
  email: string;
  phone: string;
  influence: InfluenceLevel;
  interest: InterestLevel;
  category: string;
  notes: string;
  engagementStrategy: EngagementStrategy;
}

interface EngagementContent {
  stakeholderId: string;
  type: EngagementType;
  date: string;
  topic: string;
  outcome: string;
  actionItems: string[];
  nextSteps: string;
  attendees: string[];
  status: EngagementStatus;
  completedBy: string;
  completedAt: string | null;
}

interface SentimentContent {
  stakeholderId: string;
  sentiment: SentimentLevel;
  score: number | null;
  date: string;
  reason: string;
  trend: SentimentTrend;
  recordedBy: string;
}

interface CommunicationContent {
  stakeholderId: string;
  channel: CommunicationChannel;
  subject: string;
  content: string;
  date: string;
  sentBy: string;
  status: CommunicationStatus;
  response: string;
  responseDate: string | null;
}

// ── Public interfaces ──

export interface Stakeholder {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: StakeholderType;
  organization: string;
  role: string;
  email: string;
  phone: string;
  influence: InfluenceLevel;
  interest: InterestLevel;
  category: string;
  notes: string;
  engagementStrategy: EngagementStrategy;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StakeholderEngagement {
  id: string;
  organizationId: string;
  workspaceId: string;
  stakeholderId: string;
  type: EngagementType;
  date: Date;
  topic: string;
  outcome: string;
  actionItems: string[];
  nextSteps: string;
  attendees: string[];
  status: EngagementStatus;
  completedBy: string;
  completedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StakeholderSentiment {
  id: string;
  organizationId: string;
  workspaceId: string;
  stakeholderId: string;
  sentiment: SentimentLevel;
  score: number | null;
  date: Date;
  reason: string;
  trend: SentimentTrend;
  recordedBy: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StakeholderCommunication {
  id: string;
  organizationId: string;
  workspaceId: string;
  stakeholderId: string;
  channel: CommunicationChannel;
  subject: string;
  content: string;
  date: Date;
  sentBy: string;
  status: CommunicationStatus;
  response: string;
  responseDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StakeholderMatrix {
  manageClosely: Stakeholder[];
  keepSatisfied: Stakeholder[];
  keepInformed: Stakeholder[];
  monitor: Stakeholder[];
}

export interface StakeholderMetrics {
  stakeholderCount: number;
  stakeholderCountByType: Record<string, number>;
  avgSentiment: number;
  engagementFrequency: number;
  atRiskStakeholders: number;
}

export interface StakeholderStats {
  stakeholderCount: number;
  engagementCount: number;
  sentimentCount: number;
  communicationCount: number;
  completedEngagementCount: number;
  sentCommunicationCount: number;
  avgSentimentScore: number;
  byStakeholderType: Record<string, number>;
  byEngagementStatus: Record<string, number>;
  bySentiment: Record<string, number>;
  byCommunicationStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateStakeholderInput {
  name: string;
  type: StakeholderType;
  organization?: string;
  role?: string;
  email?: string;
  phone?: string;
  influence: InfluenceLevel;
  interest: InterestLevel;
  category?: string;
  notes?: string;
}

export interface UpdateStakeholderInput {
  name?: string;
  type?: StakeholderType;
  organization?: string;
  role?: string;
  email?: string;
  phone?: string;
  influence?: InfluenceLevel;
  interest?: InterestLevel;
  category?: string;
  notes?: string;
}

export interface ListStakeholdersOpts {
  type?: StakeholderType;
  influence?: InfluenceLevel;
  interest?: InterestLevel;
  category?: string;
}

export interface CreateEngagementInput {
  stakeholderId: string;
  type: EngagementType;
  date: string;
  topic: string;
  outcome?: string;
  actionItems?: string[];
  nextSteps?: string;
  attendees?: string[];
  status?: EngagementStatus;
}

export interface UpdateEngagementInput {
  type?: EngagementType;
  date?: string;
  topic?: string;
  outcome?: string;
  actionItems?: string[];
  nextSteps?: string;
  attendees?: string[];
  status?: EngagementStatus;
}

export interface ListEngagementsOpts {
  stakeholderId?: string;
  type?: EngagementType;
  status?: EngagementStatus;
}

export interface CreateSentimentInput {
  stakeholderId: string;
  sentiment: SentimentLevel;
  score?: number;
  date: string;
  reason?: string;
  trend?: SentimentTrend;
  recordedBy?: string;
}

export interface UpdateSentimentInput {
  sentiment?: SentimentLevel;
  score?: number;
  date?: string;
  reason?: string;
  trend?: SentimentTrend;
  recordedBy?: string;
}

export interface ListSentimentsOpts {
  stakeholderId?: string;
  sentiment?: SentimentLevel;
}

export interface CreateCommunicationInput {
  stakeholderId: string;
  channel: CommunicationChannel;
  subject: string;
  content: string;
  date: string;
  sentBy?: string;
  status?: CommunicationStatus;
  response?: string;
  responseDate?: string;
}

export interface UpdateCommunicationInput {
  channel?: CommunicationChannel;
  subject?: string;
  content?: string;
  date?: string;
  sentBy?: string;
  status?: CommunicationStatus;
  response?: string;
  responseDate?: string;
}

export interface ListCommunicationsOpts {
  stakeholderId?: string;
  channel?: CommunicationChannel;
  status?: CommunicationStatus;
}

// ── Helpers ──

const highInfluence: InfluenceLevel[] = ['high', 'very_high'];
const highInterest: InterestLevel[] = ['high', 'very_high'];

function calculateStrategy(influence: InfluenceLevel, interest: InterestLevel): EngagementStrategy {
  const isHighInfluence = highInfluence.includes(influence);
  const isHighInterest = highInterest.includes(interest);
  if (isHighInfluence && isHighInterest) return 'manage_closely';
  if (isHighInfluence && !isHighInterest) return 'keep_satisfied';
  if (!isHighInfluence && isHighInterest) return 'keep_informed';
  return 'monitor';
}

const sentimentScoreMap: Record<SentimentLevel, number> = {
  very_positive: 2,
  positive: 1,
  neutral: 0,
  negative: -1,
  very_negative: -2,
};

const fallbackStakeholder: StakeholderContent = {
  name: '', type: 'other', organization: '', role: '', email: '', phone: '',
  influence: 'low', interest: 'low', category: '', notes: '', engagementStrategy: 'monitor',
};

const fallbackEngagement: EngagementContent = {
  stakeholderId: '', type: 'other', date: '', topic: '', outcome: '', actionItems: [],
  nextSteps: '', attendees: [], status: 'planned', completedBy: '', completedAt: null,
};

const fallbackSentiment: SentimentContent = {
  stakeholderId: '', sentiment: 'neutral', score: null, date: '', reason: '',
  trend: 'stable', recordedBy: '',
};

const fallbackCommunication: CommunicationContent = {
  stakeholderId: '', channel: 'other', subject: '', content: '', date: '',
  sentBy: '', status: 'draft', response: '', responseDate: null,
};

function parseStakeholder(raw: string): StakeholderContent {
  if (!raw) return fallbackStakeholder;
  try {
    const p = JSON.parse(raw);
    const influence = (p.influence as InfluenceLevel) ?? 'low';
    const interest = (p.interest as InterestLevel) ?? 'low';
    return {
      name: p.name ?? '',
      type: (p.type as StakeholderType) ?? 'other',
      organization: p.organization ?? '',
      role: p.role ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      influence,
      interest,
      category: p.category ?? '',
      notes: p.notes ?? '',
      engagementStrategy: (p.engagementStrategy as EngagementStrategy) ?? calculateStrategy(influence, interest),
    };
  } catch { return fallbackStakeholder; }
}

function parseEngagement(raw: string): EngagementContent {
  if (!raw) return fallbackEngagement;
  try {
    const p = JSON.parse(raw);
    return {
      stakeholderId: p.stakeholderId ?? '',
      type: (p.type as EngagementType) ?? 'other',
      date: p.date ?? '',
      topic: p.topic ?? '',
      outcome: p.outcome ?? '',
      actionItems: Array.isArray(p.actionItems) ? p.actionItems : [],
      nextSteps: p.nextSteps ?? '',
      attendees: Array.isArray(p.attendees) ? p.attendees : [],
      status: (p.status as EngagementStatus) ?? 'planned',
      completedBy: p.completedBy ?? '',
      completedAt: p.completedAt ?? null,
    };
  } catch { return fallbackEngagement; }
}

function parseSentiment(raw: string): SentimentContent {
  if (!raw) return fallbackSentiment;
  try {
    const p = JSON.parse(raw);
    return {
      stakeholderId: p.stakeholderId ?? '',
      sentiment: (p.sentiment as SentimentLevel) ?? 'neutral',
      score: typeof p.score === 'number' ? p.score : null,
      date: p.date ?? '',
      reason: p.reason ?? '',
      trend: (p.trend as SentimentTrend) ?? 'stable',
      recordedBy: p.recordedBy ?? '',
    };
  } catch { return fallbackSentiment; }
}

function parseCommunication(raw: string): CommunicationContent {
  if (!raw) return fallbackCommunication;
  try {
    const p = JSON.parse(raw);
    return {
      stakeholderId: p.stakeholderId ?? '',
      channel: (p.channel as CommunicationChannel) ?? 'other',
      subject: p.subject ?? '',
      content: p.content ?? '',
      date: p.date ?? '',
      sentBy: p.sentBy ?? '',
      status: (p.status as CommunicationStatus) ?? 'draft',
      response: p.response ?? '',
      responseDate: p.responseDate ?? null,
    };
  } catch { return fallbackCommunication; }
}

function toStakeholder(row: MemoryRow): Stakeholder {
  const c = parseStakeholder(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, type: c.type, organization: c.organization, role: c.role,
    email: c.email, phone: c.phone, influence: c.influence, interest: c.interest,
    category: c.category, notes: c.notes, engagementStrategy: c.engagementStrategy,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEngagement(row: MemoryRow): StakeholderEngagement {
  const c = parseEngagement(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    stakeholderId: c.stakeholderId, type: c.type,
    date: c.date ? new Date(c.date) : row.createdAt,
    topic: c.topic, outcome: c.outcome, actionItems: c.actionItems,
    nextSteps: c.nextSteps, attendees: c.attendees, status: c.status,
    completedBy: c.completedBy, completedAt: c.completedAt ? new Date(c.completedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSentiment(row: MemoryRow): StakeholderSentiment {
  const c = parseSentiment(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    stakeholderId: c.stakeholderId, sentiment: c.sentiment, score: c.score,
    date: c.date ? new Date(c.date) : row.createdAt,
    reason: c.reason, trend: c.trend, recordedBy: c.recordedBy,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCommunication(row: MemoryRow): StakeholderCommunication {
  const c = parseCommunication(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    stakeholderId: c.stakeholderId, channel: c.channel, subject: c.subject,
    content: c.content, date: c.date ? new Date(c.date) : row.createdAt,
    sentBy: c.sentBy, status: c.status, response: c.response,
    responseDate: c.responseDate ? new Date(c.responseDate) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Stakeholder Service ──

export const StakeholderService = {
  // ── Stakeholders ──

  async createStakeholder(
    organizationId: string,
    workspaceId: string,
    input: CreateStakeholderInput,
    createdBy: string,
  ): Promise<Stakeholder> {
    const strategy = calculateStrategy(input.influence, input.interest);
    const content: StakeholderContent = {
      name: input.name.trim(),
      type: input.type,
      organization: input.organization ?? '',
      role: input.role ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      influence: input.influence,
      interest: input.interest,
      category: input.category ?? '',
      notes: input.notes ?? '',
      engagementStrategy: strategy,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'stakeholder',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['stakeholder', content.type, content.influence, content.interest, content.engagementStrategy]),
        createdBy,
      },
    });

    return toStakeholder(row as MemoryRow);
  },

  async getStakeholder(id: string): Promise<Stakeholder | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'stakeholder') return null;
    return toStakeholder(row as MemoryRow);
  },

  async listStakeholders(organizationId: string, opts: ListStakeholdersOpts = {}): Promise<Stakeholder[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'stakeholder', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toStakeholder(r as MemoryRow));
    if (opts.type) records = records.filter((s) => s.type === opts.type);
    if (opts.influence) records = records.filter((s) => s.influence === opts.influence);
    if (opts.interest) records = records.filter((s) => s.interest === opts.interest);
    if (opts.category) records = records.filter((s) => s.category === opts.category);
    return records;
  },

  async updateStakeholder(id: string, input: UpdateStakeholderInput): Promise<Stakeholder | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseStakeholder(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.organization !== undefined) content.organization = input.organization;
    if (input.role !== undefined) content.role = input.role;
    if (input.email !== undefined) content.email = input.email;
    if (input.phone !== undefined) content.phone = input.phone;
    if (input.influence !== undefined) content.influence = input.influence;
    if (input.interest !== undefined) content.interest = input.interest;
    if (input.category !== undefined) content.category = input.category;
    if (input.notes !== undefined) content.notes = input.notes;

    // Recalculate strategy if influence or interest changed
    if (input.influence !== undefined || input.interest !== undefined) {
      content.engagementStrategy = calculateStrategy(content.influence, content.interest);
    }

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['stakeholder', content.type, content.influence, content.interest, content.engagementStrategy]),
        },
      }), null,
    );
    if (!row) return null;
    return toStakeholder(row as MemoryRow);
  },

  async deleteStakeholder(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Engagements ──

  async createEngagement(
    organizationId: string,
    workspaceId: string,
    input: CreateEngagementInput,
    createdBy: string,
  ): Promise<StakeholderEngagement> {
    const content: EngagementContent = {
      stakeholderId: input.stakeholderId,
      type: input.type,
      date: input.date,
      topic: input.topic.trim(),
      outcome: input.outcome ?? '',
      actionItems: input.actionItems ?? [],
      nextSteps: input.nextSteps ?? '',
      attendees: input.attendees ?? [],
      status: input.status ?? 'planned',
      completedBy: '', completedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'stakeholder_engagement',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.stakeholderId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['stakeholder_engagement', content.type, content.status]),
        createdBy,
      },
    });

    return toEngagement(row as MemoryRow);
  },

  async getEngagement(id: string): Promise<StakeholderEngagement | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'stakeholder_engagement') return null;
    return toEngagement(row as MemoryRow);
  },

  async listEngagements(organizationId: string, opts: ListEngagementsOpts = {}): Promise<StakeholderEngagement[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'stakeholder_engagement', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toEngagement(r as MemoryRow));
    if (opts.stakeholderId) records = records.filter((e) => e.stakeholderId === opts.stakeholderId);
    if (opts.type) records = records.filter((e) => e.type === opts.type);
    if (opts.status) records = records.filter((e) => e.status === opts.status);
    return records;
  },

  async updateEngagement(id: string, input: UpdateEngagementInput): Promise<StakeholderEngagement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseEngagement(existing.content);
    if (input.type !== undefined) content.type = input.type;
    if (input.date !== undefined) content.date = input.date;
    if (input.topic !== undefined) content.topic = input.topic.trim();
    if (input.outcome !== undefined) content.outcome = input.outcome;
    if (input.actionItems !== undefined) content.actionItems = input.actionItems;
    if (input.nextSteps !== undefined) content.nextSteps = input.nextSteps;
    if (input.attendees !== undefined) content.attendees = input.attendees;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['stakeholder_engagement', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toEngagement(row as MemoryRow);
  },

  async completeEngagement(id: string, outcome: string, completedBy: string): Promise<StakeholderEngagement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseEngagement(existing.content);
    content.status = 'completed';
    content.outcome = outcome;
    content.completedBy = completedBy;
    content.completedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['stakeholder_engagement', content.type, 'completed']),
        },
      }), null,
    );
    if (!row) return null;
    return toEngagement(row as MemoryRow);
  },

  // ── Sentiments ──

  async createSentiment(
    organizationId: string,
    workspaceId: string,
    input: CreateSentimentInput,
    createdBy: string,
  ): Promise<StakeholderSentiment> {
    const content: SentimentContent = {
      stakeholderId: input.stakeholderId,
      sentiment: input.sentiment,
      score: input.score ?? null,
      date: input.date,
      reason: input.reason ?? '',
      trend: input.trend ?? 'stable',
      recordedBy: input.recordedBy ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'stakeholder_sentiment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.stakeholderId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['stakeholder_sentiment', content.sentiment, content.trend]),
        createdBy,
      },
    });

    return toSentiment(row as MemoryRow);
  },

  async getSentiment(id: string): Promise<StakeholderSentiment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'stakeholder_sentiment') return null;
    return toSentiment(row as MemoryRow);
  },

  async listSentiments(organizationId: string, opts: ListSentimentsOpts = {}): Promise<StakeholderSentiment[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'stakeholder_sentiment', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toSentiment(r as MemoryRow));
    if (opts.stakeholderId) records = records.filter((s) => s.stakeholderId === opts.stakeholderId);
    if (opts.sentiment) records = records.filter((s) => s.sentiment === opts.sentiment);
    return records;
  },

  async updateSentiment(id: string, input: UpdateSentimentInput): Promise<StakeholderSentiment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseSentiment(existing.content);
    if (input.sentiment !== undefined) content.sentiment = input.sentiment;
    if (input.score !== undefined) content.score = input.score;
    if (input.date !== undefined) content.date = input.date;
    if (input.reason !== undefined) content.reason = input.reason;
    if (input.trend !== undefined) content.trend = input.trend;
    if (input.recordedBy !== undefined) content.recordedBy = input.recordedBy;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['stakeholder_sentiment', content.sentiment, content.trend]),
        },
      }), null,
    );
    if (!row) return null;
    return toSentiment(row as MemoryRow);
  },

  async deleteSentiment(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Communications ──

  async createCommunication(
    organizationId: string,
    workspaceId: string,
    input: CreateCommunicationInput,
    createdBy: string,
  ): Promise<StakeholderCommunication> {
    const content: CommunicationContent = {
      stakeholderId: input.stakeholderId,
      channel: input.channel,
      subject: input.subject.trim(),
      content: input.content,
      date: input.date,
      sentBy: input.sentBy ?? '',
      status: input.status ?? 'draft',
      response: input.response ?? '',
      responseDate: input.responseDate ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'stakeholder_communication',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.stakeholderId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['stakeholder_communication', content.channel, content.status]),
        createdBy,
      },
    });

    return toCommunication(row as MemoryRow);
  },

  async getCommunication(id: string): Promise<StakeholderCommunication | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'stakeholder_communication') return null;
    return toCommunication(row as MemoryRow);
  },

  async listCommunications(organizationId: string, opts: ListCommunicationsOpts = {}): Promise<StakeholderCommunication[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'stakeholder_communication', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toCommunication(r as MemoryRow));
    if (opts.stakeholderId) records = records.filter((c) => c.stakeholderId === opts.stakeholderId);
    if (opts.channel) records = records.filter((c) => c.channel === opts.channel);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    return records;
  },

  async updateCommunication(id: string, input: UpdateCommunicationInput): Promise<StakeholderCommunication | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCommunication(existing.content);
    if (input.channel !== undefined) content.channel = input.channel;
    if (input.subject !== undefined) content.subject = input.subject.trim();
    if (input.content !== undefined) content.content = input.content;
    if (input.date !== undefined) content.date = input.date;
    if (input.sentBy !== undefined) content.sentBy = input.sentBy;
    if (input.status !== undefined) content.status = input.status;
    if (input.response !== undefined) content.response = input.response;
    if (input.responseDate !== undefined) content.responseDate = input.responseDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['stakeholder_communication', content.channel, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toCommunication(row as MemoryRow);
  },

  async sendCommunication(id: string, sentBy: string): Promise<StakeholderCommunication | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCommunication(existing.content);
    content.status = 'sent';
    content.sentBy = sentBy;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['stakeholder_communication', content.channel, 'sent']),
        },
      }), null,
    );
    if (!row) return null;
    return toCommunication(row as MemoryRow);
  },

  async logResponse(id: string, response: string, responseDate: string): Promise<StakeholderCommunication | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCommunication(existing.content);
    content.response = response;
    content.responseDate = responseDate;
    content.status = 'responded';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['stakeholder_communication', content.channel, 'responded']),
        },
      }), null,
    );
    if (!row) return null;
    return toCommunication(row as MemoryRow);
  },

  // ── Matrix ──

  async getStakeholderMatrix(organizationId: string): Promise<StakeholderMatrix> {
    const stakeholders = await StakeholderService.listStakeholders(organizationId);
    const matrix: StakeholderMatrix = {
      manageClosely: [],
      keepSatisfied: [],
      keepInformed: [],
      monitor: [],
    };
    for (const s of stakeholders) {
      switch (s.engagementStrategy) {
        case 'manage_closely': matrix.manageClosely.push(s); break;
        case 'keep_satisfied': matrix.keepSatisfied.push(s); break;
        case 'keep_informed': matrix.keepInformed.push(s); break;
        case 'monitor': matrix.monitor.push(s); break;
      }
    }
    return matrix;
  },

  // ── Metrics ──

  async getStakeholderMetrics(organizationId: string): Promise<StakeholderMetrics> {
    const [stakeholders, sentiments, engagements] = await Promise.all([
      StakeholderService.listStakeholders(organizationId),
      StakeholderService.listSentiments(organizationId),
      StakeholderService.listEngagements(organizationId),
    ]);

    const stakeholderCountByType: Record<string, number> = {};
    for (const s of stakeholders) {
      stakeholderCountByType[s.type] = (stakeholderCountByType[s.type] || 0) + 1;
    }

    // Average sentiment: latest sentiment per stakeholder
    const latestSentiment = new Map<string, StakeholderSentiment>();
    for (const s of sentiments) {
      const existing = latestSentiment.get(s.stakeholderId);
      if (!existing || s.date > existing.date) {
        latestSentiment.set(s.stakeholderId, s);
      }
    }
    const sentimentValues = Array.from(latestSentiment.values()).map((s) => sentimentScoreMap[s.sentiment] ?? 0);
    const avgSentiment = sentimentValues.length > 0
      ? Math.round((sentimentValues.reduce((sum, v) => sum + v, 0) / sentimentValues.length) * 100) / 100
      : 0;

    // Engagement frequency: engagements in last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentEngagements = engagements.filter((e) => e.date >= thirtyDaysAgo).length;
    const engagementFrequency = recentEngagements;

    // At-risk stakeholders: negative or very_negative latest sentiment
    const atRiskStakeholders = Array.from(latestSentiment.values()).filter(
      (s) => s.sentiment === 'negative' || s.sentiment === 'very_negative',
    ).length;

    return {
      stakeholderCount: stakeholders.length,
      stakeholderCountByType,
      avgSentiment,
      engagementFrequency,
      atRiskStakeholders,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<StakeholderStats> {
    const [stakeholders, engagements, sentiments, communications] = await Promise.all([
      StakeholderService.listStakeholders(organizationId),
      StakeholderService.listEngagements(organizationId),
      StakeholderService.listSentiments(organizationId),
      StakeholderService.listCommunications(organizationId),
    ]);

    const byStakeholderType: Record<string, number> = {};
    for (const s of stakeholders) {
      byStakeholderType[s.type] = (byStakeholderType[s.type] || 0) + 1;
    }

    const byEngagementStatus: Record<string, number> = {};
    let completedEngagementCount = 0;
    for (const e of engagements) {
      byEngagementStatus[e.status] = (byEngagementStatus[e.status] || 0) + 1;
      if (e.status === 'completed') completedEngagementCount++;
    }

    const bySentiment: Record<string, number> = {};
    for (const s of sentiments) {
      bySentiment[s.sentiment] = (bySentiment[s.sentiment] || 0) + 1;
    }

    const byCommunicationStatus: Record<string, number> = {};
    let sentCommunicationCount = 0;
    for (const c of communications) {
      byCommunicationStatus[c.status] = (byCommunicationStatus[c.status] || 0) + 1;
      if (c.status === 'sent' || c.status === 'responded') sentCommunicationCount++;
    }

    // Average sentiment score
    const sentimentScores = sentiments.map((s) => sentimentScoreMap[s.sentiment] ?? 0);
    const avgSentimentScore = sentimentScores.length > 0
      ? Math.round((sentimentScores.reduce((sum, v) => sum + v, 0) / sentimentScores.length) * 100) / 100
      : 0;

    return {
      stakeholderCount: stakeholders.length,
      engagementCount: engagements.length,
      sentimentCount: sentiments.length,
      communicationCount: communications.length,
      completedEngagementCount,
      sentCommunicationCount,
      avgSentimentScore,
      byStakeholderType,
      byEngagementStatus,
      bySentiment,
      byCommunicationStatus,
    };
  },
};
