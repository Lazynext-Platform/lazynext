import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type MeetingType = 'regular' | 'special' | 'annual' | 'emergency';
export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'postponed';
export type AgendaItemStatus = 'pending' | 'in_progress' | 'completed' | 'deferred';
export type ResolutionType = 'ordinary' | 'special' | 'extraordinary';
export type ResolutionStatus = 'proposed' | 'voting' | 'passed' | 'failed' | 'withdrawn';
export type VoteChoice = 'yes' | 'no' | 'abstain';
export type CommitteeType = 'audit' | 'compensation' | 'nominating' | 'governance' | 'risk' | 'ethics' | 'special';
export type CommitteeStatus = 'active' | 'inactive' | 'dissolved';
export type BoardMemberRole = 'chair' | 'director' | 'secretary' | 'observer' | 'alternate';
export type BoardMemberStatus = 'active' | 'inactive' | 'resigned' | 'term_expired';
export type BoardPackStatus = 'draft' | 'review' | 'distributed' | 'archived';

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

interface MeetingContent {
  title: string;
  date: string;
  location: string;
  type: MeetingType;
  agenda: Array<{ item: string; presenter: string; duration: string; status: AgendaItemStatus }>;
  attendees: string[];
  status: MeetingStatus;
  minutes: string;
  actionItems: string[];
  nextMeetingDate: string | null;
  cancelledReason: string | null;
  cancelledBy: string | null;
  minutesFinalizedBy: string | null;
}

interface ResolutionContent {
  title: string;
  description: string;
  type: ResolutionType;
  proposedBy: string;
  voteDeadline: string | null;
  status: ResolutionStatus;
  votes: Array<{ member: string; vote: VoteChoice; date: string }>;
  outcome: string;
  attachments: string[];
  finalizedBy: string | null;
}

interface CommitteeContent {
  name: string;
  type: CommitteeType;
  charter: string;
  members: Array<{ name: string; role: string; term: string }>;
  chair: string;
  meetingFrequency: string;
  status: CommitteeStatus;
  establishedDate: string | null;
}

interface BoardMemberContent {
  name: string;
  role: BoardMemberRole;
  email: string;
  phone: string;
  expertise: string;
  committees: string[];
  termStart: string | null;
  termEnd: string | null;
  status: BoardMemberStatus;
  bio: string;
  compensation: string;
}

interface BoardPackContent {
  meetingId: string;
  title: string;
  sections: Array<{ title: string; content: string; type: string; attachments: string[] }>;
  status: BoardPackStatus;
  distributedDate: string | null;
  distributedTo: string[];
  distributedBy: string | null;
  confidential: boolean;
}

// ── Public interfaces ──

export interface BoardMeeting {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  date: Date;
  location: string;
  type: MeetingType;
  agenda: Array<{ item: string; presenter: string; duration: string; status: AgendaItemStatus }>;
  attendees: string[];
  status: MeetingStatus;
  minutes: string;
  actionItems: string[];
  nextMeetingDate: Date | null;
  cancelledReason: string | null;
  cancelledBy: string | null;
  minutesFinalizedBy: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardResolution {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  type: ResolutionType;
  proposedBy: string;
  voteDeadline: Date | null;
  status: ResolutionStatus;
  votes: Array<{ member: string; vote: VoteChoice; date: Date }>;
  outcome: string;
  attachments: string[];
  finalizedBy: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardCommittee {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CommitteeType;
  charter: string;
  members: Array<{ name: string; role: string; term: string }>;
  chair: string;
  meetingFrequency: string;
  status: CommitteeStatus;
  establishedDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardMember {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  role: BoardMemberRole;
  email: string;
  phone: string;
  expertise: string;
  committees: string[];
  termStart: Date | null;
  termEnd: Date | null;
  status: BoardMemberStatus;
  bio: string;
  compensation: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardPack {
  id: string;
  organizationId: string;
  workspaceId: string;
  meetingId: string;
  title: string;
  sections: Array<{ title: string; content: string; type: string; attachments: string[] }>;
  status: BoardPackStatus;
  distributedDate: Date | null;
  distributedTo: string[];
  distributedBy: string | null;
  confidential: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardMetrics {
  meetingCount: number;
  completedMeetingCount: number;
  resolutionPassRate: number;
  totalResolutions: number;
  passedResolutions: number;
  committeeCoverage: number;
  totalCommittees: number;
  activeCommittees: number;
  boardPackCount: number;
  distributedBoardPackCount: number;
  boardPackTimeliness: number;
}

export interface BoardStats {
  meetingCount: number;
  resolutionCount: number;
  committeeCount: number;
  memberCount: number;
  boardPackCount: number;
  activeMemberCount: number;
  activeCommitteeCount: number;
  byMeetingStatus: Record<string, number>;
  byResolutionStatus: Record<string, number>;
  byMemberRole: Record<string, number>;
}

// ── Input / Options ──

export interface CreateMeetingInput {
  title: string;
  date: string;
  location?: string;
  type: MeetingType;
  agenda: Array<{ item: string; presenter?: string; duration?: string; status?: AgendaItemStatus }>;
  attendees?: string[];
  status?: MeetingStatus;
  minutes?: string;
  actionItems?: string[];
  nextMeetingDate?: string;
}

export interface UpdateMeetingInput {
  title?: string;
  date?: string;
  location?: string;
  type?: MeetingType;
  agenda?: Array<{ item: string; presenter?: string; duration?: string; status?: AgendaItemStatus }>;
  attendees?: string[];
  status?: MeetingStatus;
  minutes?: string;
  actionItems?: string[];
  nextMeetingDate?: string;
}

export interface ListMeetingsOpts {
  type?: MeetingType;
  status?: MeetingStatus;
}

export interface CreateResolutionInput {
  title: string;
  description?: string;
  type: ResolutionType;
  proposedBy: string;
  voteDeadline?: string;
  status?: ResolutionStatus;
  votes?: Array<{ member: string; vote: VoteChoice; date?: string }>;
  outcome?: string;
  attachments?: string[];
}

export interface UpdateResolutionInput {
  title?: string;
  description?: string;
  type?: ResolutionType;
  proposedBy?: string;
  voteDeadline?: string;
  status?: ResolutionStatus;
  votes?: Array<{ member: string; vote: VoteChoice; date?: string }>;
  outcome?: string;
  attachments?: string[];
}

export interface ListResolutionsOpts {
  type?: ResolutionType;
  status?: ResolutionStatus;
}

export interface CreateCommitteeInput {
  name: string;
  type: CommitteeType;
  charter?: string;
  members?: Array<{ name: string; role: string; term?: string }>;
  chair?: string;
  meetingFrequency?: string;
  status?: CommitteeStatus;
  establishedDate?: string;
}

export interface UpdateCommitteeInput {
  name?: string;
  type?: CommitteeType;
  charter?: string;
  members?: Array<{ name: string; role: string; term?: string }>;
  chair?: string;
  meetingFrequency?: string;
  status?: CommitteeStatus;
  establishedDate?: string;
}

export interface ListCommitteesOpts {
  type?: CommitteeType;
  status?: CommitteeStatus;
}

export interface CreateMemberInput {
  name: string;
  role: BoardMemberRole;
  email?: string;
  phone?: string;
  expertise?: string;
  committees?: string[];
  termStart?: string;
  termEnd?: string;
  status?: BoardMemberStatus;
  bio?: string;
  compensation?: string;
}

export interface UpdateMemberInput {
  name?: string;
  role?: BoardMemberRole;
  email?: string;
  phone?: string;
  expertise?: string;
  committees?: string[];
  termStart?: string;
  termEnd?: string;
  status?: BoardMemberStatus;
  bio?: string;
  compensation?: string;
}

export interface ListMembersOpts {
  role?: BoardMemberRole;
  status?: BoardMemberStatus;
}

export interface CreateBoardPackInput {
  meetingId: string;
  title: string;
  sections: Array<{ title: string; content: string; type?: string; attachments?: string[] }>;
  status?: BoardPackStatus;
  distributedDate?: string;
  distributedTo?: string[];
  confidential?: boolean;
}

export interface UpdateBoardPackInput {
  title?: string;
  sections?: Array<{ title: string; content: string; type?: string; attachments?: string[] }>;
  status?: BoardPackStatus;
  distributedDate?: string;
  distributedTo?: string[];
  confidential?: boolean;
}

export interface ListBoardPacksOpts {
  meetingId?: string;
  status?: BoardPackStatus;
}

// ── Helpers ──

const fallbackMeeting: MeetingContent = {
  title: '', date: '', location: '', type: 'regular', agenda: [], attendees: [], status: 'scheduled', minutes: '', actionItems: [], nextMeetingDate: null, cancelledReason: null, cancelledBy: null, minutesFinalizedBy: null,
};

const fallbackResolution: ResolutionContent = {
  title: '', description: '', type: 'ordinary', proposedBy: '', voteDeadline: null, status: 'proposed', votes: [], outcome: '', attachments: [], finalizedBy: null,
};

const fallbackCommittee: CommitteeContent = {
  name: '', type: 'audit', charter: '', members: [], chair: '', meetingFrequency: '', status: 'active', establishedDate: null,
};

const fallbackMember: BoardMemberContent = {
  name: '', role: 'director', email: '', phone: '', expertise: '', committees: [], termStart: null, termEnd: null, status: 'active', bio: '', compensation: '',
};

const fallbackBoardPack: BoardPackContent = {
  meetingId: '', title: '', sections: [], status: 'draft', distributedDate: null, distributedTo: [], distributedBy: null, confidential: false,
};

function parseMeeting(raw: string): MeetingContent {
  if (!raw) return fallbackMeeting;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      date: p.date ?? '',
      location: p.location ?? '',
      type: (p.type as MeetingType) ?? 'regular',
      agenda: Array.isArray(p.agenda) ? p.agenda : [],
      attendees: Array.isArray(p.attendees) ? p.attendees : [],
      status: (p.status as MeetingStatus) ?? 'scheduled',
      minutes: p.minutes ?? '',
      actionItems: Array.isArray(p.actionItems) ? p.actionItems : [],
      nextMeetingDate: p.nextMeetingDate ?? null,
      cancelledReason: p.cancelledReason ?? null,
      cancelledBy: p.cancelledBy ?? null,
      minutesFinalizedBy: p.minutesFinalizedBy ?? null,
    };
  } catch { return fallbackMeeting; }
}

function parseResolution(raw: string): ResolutionContent {
  if (!raw) return fallbackResolution;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      description: p.description ?? '',
      type: (p.type as ResolutionType) ?? 'ordinary',
      proposedBy: p.proposedBy ?? '',
      voteDeadline: p.voteDeadline ?? null,
      status: (p.status as ResolutionStatus) ?? 'proposed',
      votes: Array.isArray(p.votes) ? p.votes : [],
      outcome: p.outcome ?? '',
      attachments: Array.isArray(p.attachments) ? p.attachments : [],
      finalizedBy: p.finalizedBy ?? null,
    };
  } catch { return fallbackResolution; }
}

function parseCommittee(raw: string): CommitteeContent {
  if (!raw) return fallbackCommittee;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      type: (p.type as CommitteeType) ?? 'audit',
      charter: p.charter ?? '',
      members: Array.isArray(p.members) ? p.members : [],
      chair: p.chair ?? '',
      meetingFrequency: p.meetingFrequency ?? '',
      status: (p.status as CommitteeStatus) ?? 'active',
      establishedDate: p.establishedDate ?? null,
    };
  } catch { return fallbackCommittee; }
}

function parseMember(raw: string): BoardMemberContent {
  if (!raw) return fallbackMember;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      role: (p.role as BoardMemberRole) ?? 'director',
      email: p.email ?? '',
      phone: p.phone ?? '',
      expertise: p.expertise ?? '',
      committees: Array.isArray(p.committees) ? p.committees : [],
      termStart: p.termStart ?? null,
      termEnd: p.termEnd ?? null,
      status: (p.status as BoardMemberStatus) ?? 'active',
      bio: p.bio ?? '',
      compensation: p.compensation ?? '',
    };
  } catch { return fallbackMember; }
}

function parseBoardPack(raw: string): BoardPackContent {
  if (!raw) return fallbackBoardPack;
  try {
    const p = JSON.parse(raw);
    return {
      meetingId: p.meetingId ?? '',
      title: p.title ?? '',
      sections: Array.isArray(p.sections) ? p.sections : [],
      status: (p.status as BoardPackStatus) ?? 'draft',
      distributedDate: p.distributedDate ?? null,
      distributedTo: Array.isArray(p.distributedTo) ? p.distributedTo : [],
      distributedBy: p.distributedBy ?? null,
      confidential: p.confidential ?? false,
    };
  } catch { return fallbackBoardPack; }
}

function toMeeting(row: MemoryRow): BoardMeeting {
  const c = parseMeeting(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, date: c.date ? new Date(c.date) : row.createdAt, location: c.location,
    type: c.type, agenda: c.agenda, attendees: c.attendees, status: c.status,
    minutes: c.minutes, actionItems: c.actionItems,
    nextMeetingDate: c.nextMeetingDate ? new Date(c.nextMeetingDate) : null,
    cancelledReason: c.cancelledReason, cancelledBy: c.cancelledBy,
    minutesFinalizedBy: c.minutesFinalizedBy,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toResolution(row: MemoryRow): BoardResolution {
  const c = parseResolution(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, description: c.description, type: c.type, proposedBy: c.proposedBy,
    voteDeadline: c.voteDeadline ? new Date(c.voteDeadline) : null, status: c.status,
    votes: c.votes.map((v) => ({ member: v.member, vote: v.vote, date: v.date ? new Date(v.date) : row.createdAt })),
    outcome: c.outcome, attachments: c.attachments, finalizedBy: c.finalizedBy,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCommittee(row: MemoryRow): BoardCommittee {
  const c = parseCommittee(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, type: c.type, charter: c.charter, members: c.members, chair: c.chair,
    meetingFrequency: c.meetingFrequency, status: c.status,
    establishedDate: c.establishedDate ? new Date(c.establishedDate) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMember(row: MemoryRow): BoardMember {
  const c = parseMember(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, role: c.role, email: c.email, phone: c.phone, expertise: c.expertise,
    committees: c.committees, termStart: c.termStart ? new Date(c.termStart) : null,
    termEnd: c.termEnd ? new Date(c.termEnd) : null, status: c.status, bio: c.bio,
    compensation: c.compensation,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toBoardPack(row: MemoryRow): BoardPack {
  const c = parseBoardPack(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    meetingId: c.meetingId, title: c.title, sections: c.sections, status: c.status,
    distributedDate: c.distributedDate ? new Date(c.distributedDate) : null,
    distributedTo: c.distributedTo, distributedBy: c.distributedBy, confidential: c.confidential,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Board Service ──

export const BoardService = {
  // ── Meetings ──

  async createMeeting(
    organizationId: string,
    workspaceId: string,
    input: CreateMeetingInput,
    createdBy: string,
  ): Promise<BoardMeeting> {
    const content: MeetingContent = {
      title: input.title.trim(),
      date: input.date,
      location: input.location ?? '',
      type: input.type,
      agenda: input.agenda.map((a) => ({
        item: a.item, presenter: a.presenter ?? '', duration: a.duration ?? '', status: a.status ?? 'pending',
      })),
      attendees: input.attendees ?? [],
      status: input.status ?? 'scheduled',
      minutes: input.minutes ?? '',
      actionItems: input.actionItems ?? [],
      nextMeetingDate: input.nextMeetingDate ?? null,
      cancelledReason: null,
      cancelledBy: null,
      minutesFinalizedBy: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'board_meeting',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['board_meeting', content.type, content.status]),
        createdBy,
      },
    });

    return toMeeting(row as MemoryRow);
  },

  async getMeeting(id: string): Promise<BoardMeeting | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'board_meeting') return null;
    return toMeeting(row as MemoryRow);
  },

  async listMeetings(organizationId: string, opts: ListMeetingsOpts = {}): Promise<BoardMeeting[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'board_meeting', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toMeeting(r as MemoryRow));
    if (opts.type) records = records.filter((m) => m.type === opts.type);
    if (opts.status) records = records.filter((m) => m.status === opts.status);
    return records;
  },

  async updateMeeting(id: string, input: UpdateMeetingInput): Promise<BoardMeeting | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMeeting(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.date !== undefined) content.date = input.date;
    if (input.location !== undefined) content.location = input.location;
    if (input.type !== undefined) content.type = input.type;
    if (input.agenda !== undefined) content.agenda = input.agenda.map((a) => ({
      item: a.item, presenter: a.presenter ?? '', duration: a.duration ?? '', status: a.status ?? 'pending',
    }));
    if (input.attendees !== undefined) content.attendees = input.attendees;
    if (input.status !== undefined) content.status = input.status;
    if (input.minutes !== undefined) content.minutes = input.minutes;
    if (input.actionItems !== undefined) content.actionItems = input.actionItems;
    if (input.nextMeetingDate !== undefined) content.nextMeetingDate = input.nextMeetingDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['board_meeting', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toMeeting(row as MemoryRow);
  },

  async cancelMeeting(id: string, reason: string, cancelledBy: string): Promise<BoardMeeting | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMeeting(existing.content);
    content.status = 'cancelled';
    content.cancelledReason = reason;
    content.cancelledBy = cancelledBy;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['board_meeting', content.type, 'cancelled']),
        },
      }), null,
    );
    if (!row) return null;
    return toMeeting(row as MemoryRow);
  },

  async finalizeMinutes(id: string, minutes: string, finalizedBy: string): Promise<BoardMeeting | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMeeting(existing.content);
    content.minutes = minutes;
    content.minutesFinalizedBy = finalizedBy;
    content.status = 'completed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['board_meeting', content.type, 'completed']),
        },
      }), null,
    );
    if (!row) return null;
    return toMeeting(row as MemoryRow);
  },

  // ── Resolutions ──

  async createResolution(
    organizationId: string,
    workspaceId: string,
    input: CreateResolutionInput,
    createdBy: string,
  ): Promise<BoardResolution> {
    const content: ResolutionContent = {
      title: input.title.trim(),
      description: input.description ?? '',
      type: input.type,
      proposedBy: input.proposedBy.trim(),
      voteDeadline: input.voteDeadline ?? null,
      status: input.status ?? 'proposed',
      votes: (input.votes ?? []).map((v) => ({
        member: v.member, vote: v.vote, date: v.date ?? new Date().toISOString(),
      })),
      outcome: input.outcome ?? '',
      attachments: input.attachments ?? [],
      finalizedBy: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'board_resolution',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['board_resolution', content.type, content.status]),
        createdBy,
      },
    });

    return toResolution(row as MemoryRow);
  },

  async getResolution(id: string): Promise<BoardResolution | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'board_resolution') return null;
    return toResolution(row as MemoryRow);
  },

  async listResolutions(organizationId: string, opts: ListResolutionsOpts = {}): Promise<BoardResolution[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'board_resolution', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toResolution(r as MemoryRow));
    if (opts.type) records = records.filter((r) => r.type === opts.type);
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    return records;
  },

  async updateResolution(id: string, input: UpdateResolutionInput): Promise<BoardResolution | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseResolution(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.type !== undefined) content.type = input.type;
    if (input.proposedBy !== undefined) content.proposedBy = input.proposedBy;
    if (input.voteDeadline !== undefined) content.voteDeadline = input.voteDeadline;
    if (input.status !== undefined) content.status = input.status;
    if (input.votes !== undefined) content.votes = input.votes.map((v) => ({
      member: v.member, vote: v.vote, date: v.date ?? new Date().toISOString(),
    }));
    if (input.outcome !== undefined) content.outcome = input.outcome;
    if (input.attachments !== undefined) content.attachments = input.attachments;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['board_resolution', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toResolution(row as MemoryRow);
  },

  async castVote(id: string, member: string, vote: VoteChoice): Promise<BoardResolution | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseResolution(existing.content);
    const existingVote = content.votes.find((v) => v.member === member);
    if (existingVote) {
      existingVote.vote = vote;
      existingVote.date = new Date().toISOString();
    } else {
      content.votes.push({ member, vote, date: new Date().toISOString() });
    }
    if (content.status === 'proposed') content.status = 'voting';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['board_resolution', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toResolution(row as MemoryRow);
  },

  async finalizeResolution(id: string, outcome: string, finalizedBy: string): Promise<BoardResolution | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseResolution(existing.content);
    content.outcome = outcome;
    content.finalizedBy = finalizedBy;
    const yesVotes = content.votes.filter((v) => v.vote === 'yes').length;
    const noVotes = content.votes.filter((v) => v.vote === 'no').length;
    content.status = yesVotes > noVotes ? 'passed' : 'failed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['board_resolution', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toResolution(row as MemoryRow);
  },

  // ── Committees ──

  async createCommittee(
    organizationId: string,
    workspaceId: string,
    input: CreateCommitteeInput,
    createdBy: string,
  ): Promise<BoardCommittee> {
    const content: CommitteeContent = {
      name: input.name.trim(),
      type: input.type,
      charter: input.charter ?? '',
      members: (input.members ?? []).map((m) => ({ name: m.name, role: m.role, term: m.term ?? '' })),
      chair: input.chair ?? '',
      meetingFrequency: input.meetingFrequency ?? '',
      status: input.status ?? 'active',
      establishedDate: input.establishedDate ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'board_committee',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['board_committee', content.type, content.status]),
        createdBy,
      },
    });

    return toCommittee(row as MemoryRow);
  },

  async getCommittee(id: string): Promise<BoardCommittee | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'board_committee') return null;
    return toCommittee(row as MemoryRow);
  },

  async listCommittees(organizationId: string, opts: ListCommitteesOpts = {}): Promise<BoardCommittee[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'board_committee', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toCommittee(r as MemoryRow));
    if (opts.type) records = records.filter((c) => c.type === opts.type);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    return records;
  },

  async updateCommittee(id: string, input: UpdateCommitteeInput): Promise<BoardCommittee | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseCommittee(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.charter !== undefined) content.charter = input.charter;
    if (input.members !== undefined) content.members = input.members.map((m) => ({ name: m.name, role: m.role, term: m.term ?? '' }));
    if (input.chair !== undefined) content.chair = input.chair;
    if (input.meetingFrequency !== undefined) content.meetingFrequency = input.meetingFrequency;
    if (input.status !== undefined) content.status = input.status;
    if (input.establishedDate !== undefined) content.establishedDate = input.establishedDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['board_committee', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toCommittee(row as MemoryRow);
  },

  async deleteCommittee(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Members ──

  async createMember(
    organizationId: string,
    workspaceId: string,
    input: CreateMemberInput,
    createdBy: string,
  ): Promise<BoardMember> {
    const content: BoardMemberContent = {
      name: input.name.trim(),
      role: input.role,
      email: input.email ?? '',
      phone: input.phone ?? '',
      expertise: input.expertise ?? '',
      committees: input.committees ?? [],
      termStart: input.termStart ?? null,
      termEnd: input.termEnd ?? null,
      status: input.status ?? 'active',
      bio: input.bio ?? '',
      compensation: input.compensation ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'board_member',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['board_member', content.role, content.status]),
        createdBy,
      },
    });

    return toMember(row as MemoryRow);
  },

  async getMember(id: string): Promise<BoardMember | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'board_member') return null;
    return toMember(row as MemoryRow);
  },

  async listMembers(organizationId: string, opts: ListMembersOpts = {}): Promise<BoardMember[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'board_member', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toMember(r as MemoryRow));
    if (opts.role) records = records.filter((m) => m.role === opts.role);
    if (opts.status) records = records.filter((m) => m.status === opts.status);
    return records;
  },

  async updateMember(id: string, input: UpdateMemberInput): Promise<BoardMember | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMember(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.role !== undefined) content.role = input.role;
    if (input.email !== undefined) content.email = input.email;
    if (input.phone !== undefined) content.phone = input.phone;
    if (input.expertise !== undefined) content.expertise = input.expertise;
    if (input.committees !== undefined) content.committees = input.committees;
    if (input.termStart !== undefined) content.termStart = input.termStart;
    if (input.termEnd !== undefined) content.termEnd = input.termEnd;
    if (input.status !== undefined) content.status = input.status;
    if (input.bio !== undefined) content.bio = input.bio;
    if (input.compensation !== undefined) content.compensation = input.compensation;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['board_member', content.role, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toMember(row as MemoryRow);
  },

  async deleteMember(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Board Packs ──

  async createBoardPack(
    organizationId: string,
    workspaceId: string,
    input: CreateBoardPackInput,
    createdBy: string,
  ): Promise<BoardPack> {
    const content: BoardPackContent = {
      meetingId: input.meetingId,
      title: input.title.trim(),
      sections: input.sections.map((s) => ({
        title: s.title, content: s.content, type: s.type ?? '', attachments: s.attachments ?? [],
      })),
      status: input.status ?? 'draft',
      distributedDate: input.distributedDate ?? null,
      distributedTo: input.distributedTo ?? [],
      distributedBy: null,
      confidential: input.confidential ?? false,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'board_pack',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.meetingId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['board_pack', content.status]),
        createdBy,
      },
    });

    return toBoardPack(row as MemoryRow);
  },

  async getBoardPack(id: string): Promise<BoardPack | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'board_pack') return null;
    return toBoardPack(row as MemoryRow);
  },

  async listBoardPacks(organizationId: string, opts: ListBoardPacksOpts = {}): Promise<BoardPack[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'board_pack', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toBoardPack(r as MemoryRow));
    if (opts.meetingId) records = records.filter((p) => p.meetingId === opts.meetingId);
    if (opts.status) records = records.filter((p) => p.status === opts.status);
    return records;
  },

  async updateBoardPack(id: string, input: UpdateBoardPackInput): Promise<BoardPack | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseBoardPack(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.sections !== undefined) content.sections = input.sections.map((s) => ({
      title: s.title, content: s.content, type: s.type ?? '', attachments: s.attachments ?? [],
    }));
    if (input.status !== undefined) content.status = input.status;
    if (input.distributedDate !== undefined) content.distributedDate = input.distributedDate;
    if (input.distributedTo !== undefined) content.distributedTo = input.distributedTo;
    if (input.confidential !== undefined) content.confidential = input.confidential;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['board_pack', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toBoardPack(row as MemoryRow);
  },

  async distributeBoardPack(id: string, distributedBy: string, recipients?: string[]): Promise<BoardPack | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseBoardPack(existing.content);
    content.status = 'distributed';
    content.distributedBy = distributedBy;
    content.distributedDate = new Date().toISOString();
    if (recipients) content.distributedTo = recipients;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['board_pack', 'distributed']),
        },
      }), null,
    );
    if (!row) return null;
    return toBoardPack(row as MemoryRow);
  },

  // ── Metrics ──

  async getBoardMetrics(organizationId: string): Promise<BoardMetrics> {
    const [meetings, resolutions, committees, packs] = await Promise.all([
      BoardService.listMeetings(organizationId),
      BoardService.listResolutions(organizationId),
      BoardService.listCommittees(organizationId),
      BoardService.listBoardPacks(organizationId),
    ]);

    const completedMeetingCount = meetings.filter((m) => m.status === 'completed').length;
    const passedResolutions = resolutions.filter((r) => r.status === 'passed').length;
    const totalResolutions = resolutions.length;
    const activeCommittees = committees.filter((c) => c.status === 'active').length;
    const distributedPacks = packs.filter((p) => p.status === 'distributed');

    // board pack timeliness: percentage of packs distributed before their meeting date
    let timelyPacks = 0;
    for (const p of distributedPacks) {
      const meeting = meetings.find((m) => m.id === p.meetingId);
      if (meeting && p.distributedDate && p.distributedDate <= meeting.date) timelyPacks++;
    }
    const boardPackTimeliness = distributedPacks.length > 0
      ? Math.round((timelyPacks / distributedPacks.length) * 100)
      : 0;

    return {
      meetingCount: meetings.length,
      completedMeetingCount,
      resolutionPassRate: totalResolutions > 0 ? Math.round((passedResolutions / totalResolutions) * 100) : 0,
      totalResolutions,
      passedResolutions,
      committeeCoverage: committees.length > 0 ? Math.round((activeCommittees / committees.length) * 100) : 0,
      totalCommittees: committees.length,
      activeCommittees,
      boardPackCount: packs.length,
      distributedBoardPackCount: distributedPacks.length,
      boardPackTimeliness,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<BoardStats> {
    const [meetings, resolutions, committees, members, packs] = await Promise.all([
      BoardService.listMeetings(organizationId),
      BoardService.listResolutions(organizationId),
      BoardService.listCommittees(organizationId),
      BoardService.listMembers(organizationId),
      BoardService.listBoardPacks(organizationId),
    ]);

    const byMeetingStatus: Record<string, number> = {};
    for (const m of meetings) byMeetingStatus[m.status] = (byMeetingStatus[m.status] || 0) + 1;

    const byResolutionStatus: Record<string, number> = {};
    for (const r of resolutions) byResolutionStatus[r.status] = (byResolutionStatus[r.status] || 0) + 1;

    const byMemberRole: Record<string, number> = {};
    let activeMemberCount = 0;
    for (const m of members) {
      byMemberRole[m.role] = (byMemberRole[m.role] || 0) + 1;
      if (m.status === 'active') activeMemberCount++;
    }

    const activeCommitteeCount = committees.filter((c) => c.status === 'active').length;

    return {
      meetingCount: meetings.length,
      resolutionCount: resolutions.length,
      committeeCount: committees.length,
      memberCount: members.length,
      boardPackCount: packs.length,
      activeMemberCount,
      activeCommitteeCount,
      byMeetingStatus,
      byResolutionStatus,
      byMemberRole,
    };
  },
};
