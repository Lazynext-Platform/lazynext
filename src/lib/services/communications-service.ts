import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PressReleaseStatus = 'draft' | 'review' | 'approved' | 'published' | 'embargoed';
export type MediaContactStatus = 'active' | 'inactive' | 'blacklisted';
export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';
export type CrisisType = 'product' | 'reputation' | 'data_breach' | 'executive' | 'legal' | 'operational' | 'other';
export type CrisisStatus = 'monitoring' | 'active' | 'contained' | 'resolved' | 'post_mortem';
export type MentionSource = 'news' | 'blog' | 'social' | 'podcast' | 'video' | 'other';
export type MentionSentiment = 'positive' | 'neutral' | 'negative';
export type SpeakerStatus = 'identified' | 'pitched' | 'accepted' | 'declined' | 'completed';

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

interface PressReleaseContent {
  title: string;
  content: string;
  summary: string;
  status: PressReleaseStatus;
  publishDate: string | null;
  embargoDate: string | null;
  author: string;
  distributionList: string[];
  tags: string[];
  mediaAssets: string[];
  publishedBy: string;
  publishedAt: string | null;
}

interface MediaContactContent {
  name: string;
  outlet: string;
  role: string;
  email: string;
  phone: string;
  beat: string;
  relationship: string;
  notes: string;
  status: MediaContactStatus;
}

interface CrisisContent {
  title: string;
  description: string;
  severity: CrisisSeverity;
  type: CrisisType;
  status: CrisisStatus;
  spokesperson: string;
  statements: Array<{ date: string; channel: string; content: string }>;
  mediaInquiries: number;
  affectedAudiences: string[];
  actionPlan: string;
  timeline: Array<{ date: string; event: string }>;
  activatedBy: string;
  activatedAt: string | null;
  resolvedBy: string;
  resolvedAt: string | null;
  resolution: string;
}

interface MentionContent {
  source: MentionSource;
  outlet: string;
  title: string;
  url: string;
  sentiment: MentionSentiment;
  reach: number | null;
  date: string;
  author: string;
  summary: string;
  tags: string[];
}

interface SpeakerOpportunityContent {
  event: string;
  date: string;
  location: string;
  audience: string;
  topic: string;
  speaker: string;
  status: SpeakerStatus;
  deadline: string | null;
  notes: string;
}

// ── Public interfaces ──

export interface PressRelease {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  content: string;
  summary: string;
  status: PressReleaseStatus;
  publishDate: Date | null;
  embargoDate: Date | null;
  author: string;
  distributionList: string[];
  tags: string[];
  mediaAssets: string[];
  publishedBy: string;
  publishedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaContact {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  outlet: string;
  role: string;
  email: string;
  phone: string;
  beat: string;
  relationship: string;
  notes: string;
  status: MediaContactStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Crisis {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  severity: CrisisSeverity;
  type: CrisisType;
  status: CrisisStatus;
  spokesperson: string;
  statements: Array<{ date: string; channel: string; content: string }>;
  mediaInquiries: number;
  affectedAudiences: string[];
  actionPlan: string;
  timeline: Array<{ date: string; event: string }>;
  activatedBy: string;
  activatedAt: Date | null;
  resolvedBy: string;
  resolvedAt: Date | null;
  resolution: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Mention {
  id: string;
  organizationId: string;
  workspaceId: string;
  source: MentionSource;
  outlet: string;
  title: string;
  url: string;
  sentiment: MentionSentiment;
  reach: number | null;
  date: Date;
  author: string;
  summary: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpeakerOpportunity {
  id: string;
  organizationId: string;
  workspaceId: string;
  event: string;
  date: Date;
  location: string;
  audience: string;
  topic: string;
  speaker: string;
  status: SpeakerStatus;
  deadline: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PRMetrics {
  pressReleasesByStatus: Record<string, number>;
  mentionsBySentiment: Record<string, number>;
  shareOfVoice: number;
  avgSentiment: number;
  crisisCount: number;
  activeCrisisCount: number;
  speakerOpportunities: number;
  acceptedSpeakerCount: number;
}

export interface PRStats {
  pressReleaseCount: number;
  publishedPressReleaseCount: number;
  mediaContactCount: number;
  activeMediaContactCount: number;
  crisisCount: number;
  activeCrisisCount: number;
  mentionCount: number;
  positiveMentionCount: number;
  negativeMentionCount: number;
  speakerOpportunityCount: number;
  acceptedSpeakerCount: number;
  byPressReleaseStatus: Record<string, number>;
  byMentionSentiment: Record<string, number>;
  byCrisisSeverity: Record<string, number>;
  bySpeakerStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePressReleaseInput {
  title: string;
  content: string;
  summary?: string;
  status: PressReleaseStatus;
  publishDate?: string;
  embargoDate?: string;
  author?: string;
  distributionList?: string[];
  tags?: string[];
  mediaAssets?: string[];
}

export interface UpdatePressReleaseInput {
  title?: string;
  content?: string;
  summary?: string;
  status?: PressReleaseStatus;
  publishDate?: string;
  embargoDate?: string;
  author?: string;
  distributionList?: string[];
  tags?: string[];
  mediaAssets?: string[];
}

export interface ListPressReleasesOpts {
  status?: PressReleaseStatus;
  author?: string;
}

export interface CreateMediaContactInput {
  name: string;
  outlet: string;
  role?: string;
  email?: string;
  phone?: string;
  beat?: string;
  relationship?: string;
  notes?: string;
  status?: MediaContactStatus;
}

export interface UpdateMediaContactInput {
  name?: string;
  outlet?: string;
  role?: string;
  email?: string;
  phone?: string;
  beat?: string;
  relationship?: string;
  notes?: string;
  status?: MediaContactStatus;
}

export interface ListMediaContactsOpts {
  outlet?: string;
  beat?: string;
  status?: MediaContactStatus;
}

export interface CreateCrisisInput {
  title: string;
  description?: string;
  severity: CrisisSeverity;
  type: CrisisType;
  status?: CrisisStatus;
  spokesperson?: string;
  statements?: Array<{ date: string; channel: string; content: string }>;
  mediaInquiries?: number;
  affectedAudiences?: string[];
  actionPlan?: string;
  timeline?: Array<{ date: string; event: string }>;
}

export interface UpdateCrisisInput {
  title?: string;
  description?: string;
  severity?: CrisisSeverity;
  type?: CrisisType;
  status?: CrisisStatus;
  spokesperson?: string;
  mediaInquiries?: number;
  affectedAudiences?: string[];
  actionPlan?: string;
  timeline?: Array<{ date: string; event: string }>;
}

export interface ListCrisesOpts {
  severity?: CrisisSeverity;
  status?: CrisisStatus;
  type?: CrisisType;
}

export interface CreateMentionInput {
  source: MentionSource;
  outlet: string;
  title: string;
  url?: string;
  sentiment: MentionSentiment;
  reach?: number;
  date: string;
  author?: string;
  summary?: string;
  tags?: string[];
}

export interface UpdateMentionInput {
  source?: MentionSource;
  outlet?: string;
  title?: string;
  url?: string;
  sentiment?: MentionSentiment;
  reach?: number;
  date?: string;
  author?: string;
  summary?: string;
  tags?: string[];
}

export interface ListMentionsOpts {
  sentiment?: MentionSentiment;
  source?: MentionSource;
  outlet?: string;
}

export interface CreateSpeakerOpportunityInput {
  event: string;
  date: string;
  location?: string;
  audience?: string;
  topic?: string;
  speaker?: string;
  status: SpeakerStatus;
  deadline?: string;
  notes?: string;
}

export interface UpdateSpeakerOpportunityInput {
  event?: string;
  date?: string;
  location?: string;
  audience?: string;
  topic?: string;
  speaker?: string;
  status?: SpeakerStatus;
  deadline?: string;
  notes?: string;
}

export interface ListSpeakerOpportunitiesOpts {
  status?: SpeakerStatus;
  speaker?: string;
}

// ── Helpers ──

const fallbackPR: PressReleaseContent = {
  title: '', content: '', summary: '', status: 'draft', publishDate: null, embargoDate: null,
  author: '', distributionList: [], tags: [], mediaAssets: [], publishedBy: '', publishedAt: null,
};

const fallbackContact: MediaContactContent = {
  name: '', outlet: '', role: '', email: '', phone: '', beat: '', relationship: '', notes: '', status: 'active',
};

const fallbackCrisis: CrisisContent = {
  title: '', description: '', severity: 'medium', type: 'other', status: 'monitoring',
  spokesperson: '', statements: [], mediaInquiries: 0, affectedAudiences: [], actionPlan: '',
  timeline: [], activatedBy: '', activatedAt: null, resolvedBy: '', resolvedAt: null, resolution: '',
};

const fallbackMention: MentionContent = {
  source: 'news', outlet: '', title: '', url: '', sentiment: 'neutral', reach: null,
  date: '', author: '', summary: '', tags: [],
};

const fallbackSpeaker: SpeakerOpportunityContent = {
  event: '', date: '', location: '', audience: '', topic: '', speaker: '', status: 'identified',
  deadline: null, notes: '',
};

function parsePR(raw: string): PressReleaseContent {
  if (!raw) return fallbackPR;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      content: p.content ?? '',
      summary: p.summary ?? '',
      status: (p.status as PressReleaseStatus) ?? 'draft',
      publishDate: p.publishDate ?? null,
      embargoDate: p.embargoDate ?? null,
      author: p.author ?? '',
      distributionList: Array.isArray(p.distributionList) ? p.distributionList : [],
      tags: Array.isArray(p.tags) ? p.tags : [],
      mediaAssets: Array.isArray(p.mediaAssets) ? p.mediaAssets : [],
      publishedBy: p.publishedBy ?? '',
      publishedAt: p.publishedAt ?? null,
    };
  } catch { return fallbackPR; }
}

function parseContact(raw: string): MediaContactContent {
  if (!raw) return fallbackContact;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      outlet: p.outlet ?? '',
      role: p.role ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      beat: p.beat ?? '',
      relationship: p.relationship ?? '',
      notes: p.notes ?? '',
      status: (p.status as MediaContactStatus) ?? 'active',
    };
  } catch { return fallbackContact; }
}

function parseCrisis(raw: string): CrisisContent {
  if (!raw) return fallbackCrisis;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      description: p.description ?? '',
      severity: (p.severity as CrisisSeverity) ?? 'medium',
      type: (p.type as CrisisType) ?? 'other',
      status: (p.status as CrisisStatus) ?? 'monitoring',
      spokesperson: p.spokesperson ?? '',
      statements: Array.isArray(p.statements) ? p.statements : [],
      mediaInquiries: p.mediaInquiries ?? 0,
      affectedAudiences: Array.isArray(p.affectedAudiences) ? p.affectedAudiences : [],
      actionPlan: p.actionPlan ?? '',
      timeline: Array.isArray(p.timeline) ? p.timeline : [],
      activatedBy: p.activatedBy ?? '',
      activatedAt: p.activatedAt ?? null,
      resolvedBy: p.resolvedBy ?? '',
      resolvedAt: p.resolvedAt ?? null,
      resolution: p.resolution ?? '',
    };
  } catch { return fallbackCrisis; }
}

function parseMention(raw: string): MentionContent {
  if (!raw) return fallbackMention;
  try {
    const p = JSON.parse(raw);
    return {
      source: (p.source as MentionSource) ?? 'news',
      outlet: p.outlet ?? '',
      title: p.title ?? '',
      url: p.url ?? '',
      sentiment: (p.sentiment as MentionSentiment) ?? 'neutral',
      reach: p.reach ?? null,
      date: p.date ?? '',
      author: p.author ?? '',
      summary: p.summary ?? '',
      tags: Array.isArray(p.tags) ? p.tags : [],
    };
  } catch { return fallbackMention; }
}

function parseSpeaker(raw: string): SpeakerOpportunityContent {
  if (!raw) return fallbackSpeaker;
  try {
    const p = JSON.parse(raw);
    return {
      event: p.event ?? '',
      date: p.date ?? '',
      location: p.location ?? '',
      audience: p.audience ?? '',
      topic: p.topic ?? '',
      speaker: p.speaker ?? '',
      status: (p.status as SpeakerStatus) ?? 'identified',
      deadline: p.deadline ?? null,
      notes: p.notes ?? '',
    };
  } catch { return fallbackSpeaker; }
}

function toPR(row: MemoryRow): PressRelease {
  const c = parsePR(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, content: c.content, summary: c.summary, status: c.status,
    publishDate: c.publishDate ? new Date(c.publishDate) : null,
    embargoDate: c.embargoDate ? new Date(c.embargoDate) : null,
    author: c.author, distributionList: c.distributionList, tags: c.tags, mediaAssets: c.mediaAssets,
    publishedBy: c.publishedBy, publishedAt: c.publishedAt ? new Date(c.publishedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toContact(row: MemoryRow): MediaContact {
  const c = parseContact(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, outlet: c.outlet, role: c.role, email: c.email, phone: c.phone,
    beat: c.beat, relationship: c.relationship, notes: c.notes, status: c.status,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCrisis(row: MemoryRow): Crisis {
  const c = parseCrisis(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, description: c.description, severity: c.severity, type: c.type, status: c.status,
    spokesperson: c.spokesperson, statements: c.statements, mediaInquiries: c.mediaInquiries,
    affectedAudiences: c.affectedAudiences, actionPlan: c.actionPlan, timeline: c.timeline,
    activatedBy: c.activatedBy, activatedAt: c.activatedAt ? new Date(c.activatedAt) : null,
    resolvedBy: c.resolvedBy, resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : null,
    resolution: c.resolution,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMention(row: MemoryRow): Mention {
  const c = parseMention(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    source: c.source, outlet: c.outlet, title: c.title, url: c.url, sentiment: c.sentiment,
    reach: c.reach, date: c.date ? new Date(c.date) : row.createdAt,
    author: c.author, summary: c.summary, tags: c.tags,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSpeaker(row: MemoryRow): SpeakerOpportunity {
  const c = parseSpeaker(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    event: c.event, date: c.date ? new Date(c.date) : row.createdAt,
    location: c.location, audience: c.audience, topic: c.topic, speaker: c.speaker,
    status: c.status, deadline: c.deadline ? new Date(c.deadline) : null, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Communications Service ──

export const CommunicationsService = {
  // ── Press Releases ──

  async createPressRelease(
    organizationId: string,
    workspaceId: string,
    input: CreatePressReleaseInput,
    createdBy: string,
  ): Promise<PressRelease> {
    const content: PressReleaseContent = {
      title: input.title.trim(),
      content: input.content,
      summary: input.summary ?? '',
      status: input.status ?? 'draft',
      publishDate: input.publishDate ?? null,
      embargoDate: input.embargoDate ?? null,
      author: input.author ?? '',
      distributionList: input.distributionList ?? [],
      tags: input.tags ?? [],
      mediaAssets: input.mediaAssets ?? [],
      publishedBy: '',
      publishedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'pr_press_release',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['pr_press_release', content.status]),
        createdBy,
      },
    });

    return toPR(row as MemoryRow);
  },

  async getPressRelease(id: string): Promise<PressRelease | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'pr_press_release') return null;
    return toPR(row as MemoryRow);
  },

  async listPressReleases(organizationId: string, opts: ListPressReleasesOpts = {}): Promise<PressRelease[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'pr_press_release', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toPR(r as MemoryRow));
    if (opts.status) records = records.filter((p) => p.status === opts.status);
    if (opts.author) records = records.filter((p) => p.author === opts.author);
    return records;
  },

  async updatePressRelease(id: string, input: UpdatePressReleaseInput): Promise<PressRelease | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parsePR(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.content !== undefined) content.content = input.content;
    if (input.summary !== undefined) content.summary = input.summary;
    if (input.status !== undefined) content.status = input.status;
    if (input.publishDate !== undefined) content.publishDate = input.publishDate;
    if (input.embargoDate !== undefined) content.embargoDate = input.embargoDate;
    if (input.author !== undefined) content.author = input.author;
    if (input.distributionList !== undefined) content.distributionList = input.distributionList;
    if (input.tags !== undefined) content.tags = input.tags;
    if (input.mediaAssets !== undefined) content.mediaAssets = input.mediaAssets;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['pr_press_release', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toPR(row as MemoryRow);
  },

  async publishPressRelease(id: string, publishedBy: string): Promise<PressRelease | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parsePR(existing.content);
    content.status = 'published';
    content.publishedBy = publishedBy;
    content.publishedAt = new Date().toISOString();
    if (!content.publishDate) content.publishDate = content.publishedAt;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['pr_press_release', 'published']),
        },
      }), null,
    );
    if (!row) return null;
    return toPR(row as MemoryRow);
  },

  async deletePressRelease(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Media Contacts ──

  async createMediaContact(
    organizationId: string,
    workspaceId: string,
    input: CreateMediaContactInput,
    createdBy: string,
  ): Promise<MediaContact> {
    const content: MediaContactContent = {
      name: input.name.trim(),
      outlet: input.outlet.trim(),
      role: input.role ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      beat: input.beat ?? '',
      relationship: input.relationship ?? '',
      notes: input.notes ?? '',
      status: input.status ?? 'active',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'pr_media_contact',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['pr_media_contact', content.status, content.beat]),
        createdBy,
      },
    });

    return toContact(row as MemoryRow);
  },

  async getMediaContact(id: string): Promise<MediaContact | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'pr_media_contact') return null;
    return toContact(row as MemoryRow);
  },

  async listMediaContacts(organizationId: string, opts: ListMediaContactsOpts = {}): Promise<MediaContact[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'pr_media_contact', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toContact(r as MemoryRow));
    if (opts.outlet) records = records.filter((c) => c.outlet === opts.outlet);
    if (opts.beat) records = records.filter((c) => c.beat === opts.beat);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    return records;
  },

  async updateMediaContact(id: string, input: UpdateMediaContactInput): Promise<MediaContact | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseContact(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.outlet !== undefined) content.outlet = input.outlet.trim();
    if (input.role !== undefined) content.role = input.role;
    if (input.email !== undefined) content.email = input.email;
    if (input.phone !== undefined) content.phone = input.phone;
    if (input.beat !== undefined) content.beat = input.beat;
    if (input.relationship !== undefined) content.relationship = input.relationship;
    if (input.notes !== undefined) content.notes = input.notes;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['pr_media_contact', content.status, content.beat]),
        },
      }), null,
    );
    if (!row) return null;
    return toContact(row as MemoryRow);
  },

  async deleteMediaContact(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Crises ──

  async createCrisis(
    organizationId: string,
    workspaceId: string,
    input: CreateCrisisInput,
    createdBy: string,
  ): Promise<Crisis> {
    const content: CrisisContent = {
      title: input.title.trim(),
      description: input.description ?? '',
      severity: input.severity,
      type: input.type,
      status: input.status ?? 'monitoring',
      spokesperson: input.spokesperson ?? '',
      statements: input.statements ?? [],
      mediaInquiries: input.mediaInquiries ?? 0,
      affectedAudiences: input.affectedAudiences ?? [],
      actionPlan: input.actionPlan ?? '',
      timeline: input.timeline ?? [],
      activatedBy: '',
      activatedAt: null,
      resolvedBy: '',
      resolvedAt: null,
      resolution: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'pr_crisis',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['pr_crisis', content.severity, content.status, content.type]),
        createdBy,
      },
    });

    return toCrisis(row as MemoryRow);
  },

  async getCrisis(id: string): Promise<Crisis | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'pr_crisis') return null;
    return toCrisis(row as MemoryRow);
  },

  async listCrises(organizationId: string, opts: ListCrisesOpts = {}): Promise<Crisis[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'pr_crisis', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toCrisis(r as MemoryRow));
    if (opts.severity) records = records.filter((c) => c.severity === opts.severity);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    if (opts.type) records = records.filter((c) => c.type === opts.type);
    return records;
  },

  async updateCrisis(id: string, input: UpdateCrisisInput): Promise<Crisis | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCrisis(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.severity !== undefined) content.severity = input.severity;
    if (input.type !== undefined) content.type = input.type;
    if (input.status !== undefined) content.status = input.status;
    if (input.spokesperson !== undefined) content.spokesperson = input.spokesperson;
    if (input.mediaInquiries !== undefined) content.mediaInquiries = input.mediaInquiries;
    if (input.affectedAudiences !== undefined) content.affectedAudiences = input.affectedAudiences;
    if (input.actionPlan !== undefined) content.actionPlan = input.actionPlan;
    if (input.timeline !== undefined) content.timeline = input.timeline;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['pr_crisis', content.severity, content.status, content.type]),
        },
      }), null,
    );
    if (!row) return null;
    return toCrisis(row as MemoryRow);
  },

  async activateCrisis(id: string, activatedBy: string): Promise<Crisis | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCrisis(existing.content);
    content.status = 'active';
    content.activatedBy = activatedBy;
    content.activatedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['pr_crisis', content.severity, 'active', content.type]),
        },
      }), null,
    );
    if (!row) return null;
    return toCrisis(row as MemoryRow);
  },

  async resolveCrisis(id: string, resolution: string, resolvedBy: string): Promise<Crisis | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCrisis(existing.content);
    content.status = 'resolved';
    content.resolution = resolution;
    content.resolvedBy = resolvedBy;
    content.resolvedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['pr_crisis', content.severity, 'resolved', content.type]),
        },
      }), null,
    );
    if (!row) return null;
    return toCrisis(row as MemoryRow);
  },

  async addStatement(id: string, statement: { date: string; channel: string; content: string }, addedBy: string): Promise<Crisis | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCrisis(existing.content);
    content.statements = [...content.statements, statement];

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          owner: addedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toCrisis(row as MemoryRow);
  },

  // ── Mentions ──

  async createMention(
    organizationId: string,
    workspaceId: string,
    input: CreateMentionInput,
    createdBy: string,
  ): Promise<Mention> {
    const content: MentionContent = {
      source: input.source,
      outlet: input.outlet.trim(),
      title: input.title.trim(),
      url: input.url ?? '',
      sentiment: input.sentiment,
      reach: input.reach ?? null,
      date: input.date,
      author: input.author ?? '',
      summary: input.summary ?? '',
      tags: input.tags ?? [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'pr_mention',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['pr_mention', content.source, content.sentiment]),
        createdBy,
      },
    });

    return toMention(row as MemoryRow);
  },

  async getMention(id: string): Promise<Mention | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'pr_mention') return null;
    return toMention(row as MemoryRow);
  },

  async listMentions(organizationId: string, opts: ListMentionsOpts = {}): Promise<Mention[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'pr_mention', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toMention(r as MemoryRow));
    if (opts.sentiment) records = records.filter((m) => m.sentiment === opts.sentiment);
    if (opts.source) records = records.filter((m) => m.source === opts.source);
    if (opts.outlet) records = records.filter((m) => m.outlet === opts.outlet);
    return records;
  },

  async updateMention(id: string, input: UpdateMentionInput): Promise<Mention | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMention(existing.content);
    if (input.source !== undefined) content.source = input.source;
    if (input.outlet !== undefined) content.outlet = input.outlet.trim();
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.url !== undefined) content.url = input.url;
    if (input.sentiment !== undefined) content.sentiment = input.sentiment;
    if (input.reach !== undefined) content.reach = input.reach;
    if (input.date !== undefined) content.date = input.date;
    if (input.author !== undefined) content.author = input.author;
    if (input.summary !== undefined) content.summary = input.summary;
    if (input.tags !== undefined) content.tags = input.tags;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['pr_mention', content.source, content.sentiment]),
        },
      }), null,
    );
    if (!row) return null;
    return toMention(row as MemoryRow);
  },

  async deleteMention(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Speaker Opportunities ──

  async createSpeakerOpportunity(
    organizationId: string,
    workspaceId: string,
    input: CreateSpeakerOpportunityInput,
    createdBy: string,
  ): Promise<SpeakerOpportunity> {
    const content: SpeakerOpportunityContent = {
      event: input.event.trim(),
      date: input.date,
      location: input.location ?? '',
      audience: input.audience ?? '',
      topic: input.topic ?? '',
      speaker: input.speaker ?? '',
      status: input.status ?? 'identified',
      deadline: input.deadline ?? null,
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'pr_speaker_opportunity',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['pr_speaker_opportunity', content.status]),
        createdBy,
      },
    });

    return toSpeaker(row as MemoryRow);
  },

  async getSpeakerOpportunity(id: string): Promise<SpeakerOpportunity | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'pr_speaker_opportunity') return null;
    return toSpeaker(row as MemoryRow);
  },

  async listSpeakerOpportunities(organizationId: string, opts: ListSpeakerOpportunitiesOpts = {}): Promise<SpeakerOpportunity[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'pr_speaker_opportunity', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toSpeaker(r as MemoryRow));
    if (opts.status) records = records.filter((s) => s.status === opts.status);
    if (opts.speaker) records = records.filter((s) => s.speaker === opts.speaker);
    return records;
  },

  async updateSpeakerOpportunity(id: string, input: UpdateSpeakerOpportunityInput): Promise<SpeakerOpportunity | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseSpeaker(existing.content);
    if (input.event !== undefined) content.event = input.event.trim();
    if (input.date !== undefined) content.date = input.date;
    if (input.location !== undefined) content.location = input.location;
    if (input.audience !== undefined) content.audience = input.audience;
    if (input.topic !== undefined) content.topic = input.topic;
    if (input.speaker !== undefined) content.speaker = input.speaker;
    if (input.status !== undefined) content.status = input.status;
    if (input.deadline !== undefined) content.deadline = input.deadline;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['pr_speaker_opportunity', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toSpeaker(row as MemoryRow);
  },

  // ── Metrics ──

  async getPRMetrics(organizationId: string): Promise<PRMetrics> {
    const [pressReleases, mentions, crises, speakers] = await Promise.all([
      CommunicationsService.listPressReleases(organizationId),
      CommunicationsService.listMentions(organizationId),
      CommunicationsService.listCrises(organizationId),
      CommunicationsService.listSpeakerOpportunities(organizationId),
    ]);

    const pressReleasesByStatus: Record<string, number> = {};
    for (const p of pressReleases) {
      pressReleasesByStatus[p.status] = (pressReleasesByStatus[p.status] || 0) + 1;
    }

    const mentionsBySentiment: Record<string, number> = {};
    let sentimentSum = 0;
    let totalReach = 0;
    for (const m of mentions) {
      mentionsBySentiment[m.sentiment] = (mentionsBySentiment[m.sentiment] || 0) + 1;
      const val = m.sentiment === 'positive' ? 1 : m.sentiment === 'negative' ? -1 : 0;
      sentimentSum += val;
      if (m.reach) totalReach += m.reach;
    }
    const avgSentiment = mentions.length > 0 ? Math.round((sentimentSum / mentions.length) * 100) / 100 : 0;
    const shareOfVoice = totalReach;

    let activeCrisisCount = 0;
    for (const c of crises) {
      if (c.status === 'active' || c.status === 'monitoring') activeCrisisCount++;
    }

    let acceptedSpeakerCount = 0;
    for (const s of speakers) {
      if (s.status === 'accepted' || s.status === 'completed') acceptedSpeakerCount++;
    }

    return {
      pressReleasesByStatus,
      mentionsBySentiment,
      shareOfVoice,
      avgSentiment,
      crisisCount: crises.length,
      activeCrisisCount,
      speakerOpportunities: speakers.length,
      acceptedSpeakerCount,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<PRStats> {
    const [pressReleases, contacts, crises, mentions, speakers] = await Promise.all([
      CommunicationsService.listPressReleases(organizationId),
      CommunicationsService.listMediaContacts(organizationId),
      CommunicationsService.listCrises(organizationId),
      CommunicationsService.listMentions(organizationId),
      CommunicationsService.listSpeakerOpportunities(organizationId),
    ]);

    const byPressReleaseStatus: Record<string, number> = {};
    let publishedPressReleaseCount = 0;
    for (const p of pressReleases) {
      byPressReleaseStatus[p.status] = (byPressReleaseStatus[p.status] || 0) + 1;
      if (p.status === 'published') publishedPressReleaseCount++;
    }

    let activeMediaContactCount = 0;
    for (const c of contacts) {
      if (c.status === 'active') activeMediaContactCount++;
    }

    const byCrisisSeverity: Record<string, number> = {};
    let activeCrisisCount = 0;
    for (const c of crises) {
      byCrisisSeverity[c.severity] = (byCrisisSeverity[c.severity] || 0) + 1;
      if (c.status === 'active' || c.status === 'monitoring') activeCrisisCount++;
    }

    const byMentionSentiment: Record<string, number> = {};
    let positiveMentionCount = 0;
    let negativeMentionCount = 0;
    for (const m of mentions) {
      byMentionSentiment[m.sentiment] = (byMentionSentiment[m.sentiment] || 0) + 1;
      if (m.sentiment === 'positive') positiveMentionCount++;
      if (m.sentiment === 'negative') negativeMentionCount++;
    }

    const bySpeakerStatus: Record<string, number> = {};
    let acceptedSpeakerCount = 0;
    for (const s of speakers) {
      bySpeakerStatus[s.status] = (bySpeakerStatus[s.status] || 0) + 1;
      if (s.status === 'accepted' || s.status === 'completed') acceptedSpeakerCount++;
    }

    return {
      pressReleaseCount: pressReleases.length,
      publishedPressReleaseCount,
      mediaContactCount: contacts.length,
      activeMediaContactCount,
      crisisCount: crises.length,
      activeCrisisCount,
      mentionCount: mentions.length,
      positiveMentionCount,
      negativeMentionCount,
      speakerOpportunityCount: speakers.length,
      acceptedSpeakerCount,
      byPressReleaseStatus,
      byMentionSentiment,
      byCrisisSeverity,
      bySpeakerStatus,
    };
  },
};
