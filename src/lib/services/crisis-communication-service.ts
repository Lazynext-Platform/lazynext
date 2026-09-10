import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type CrisisPlanType = 'product_recall' | 'data_breach' | 'natural_disaster' | 'executive_misconduct' | 'workplace_violence' | 'financial_crisis' | 'reputational' | 'operational' | 'legal';
export type CrisisPlanStatus = 'draft' | 'approved' | 'active' | 'executed' | 'archived';
export type CrisisMessageType = 'initial_statement' | 'update' | 'correction' | 'apology' | 'reassurance' | 'action_taken' | 'resolution' | 'faq';
export type CrisisMessageStatus = 'draft' | 'approved' | 'sent' | 'published' | 'retracted';
export type StakeholderCommunicationType = 'employees' | 'customers' | 'investors' | 'suppliers' | 'regulators' | 'media' | 'community' | 'partners' | 'board';
export type StakeholderCommunicationStatus = 'planned' | 'in_progress' | 'sent' | 'completed' | 'cancelled';
export type MediaInquiryType = 'press' | 'television' | 'radio' | 'online' | 'social_media' | 'blog' | 'podcast' | 'industry';
export type MediaInquiryStatus = 'received' | 'responding' | 'responded' | 'declined' | 'escalated';

// ── Interfaces ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  accessPolicy: string | null;
  lifecycle: string;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CrisisPlanType;
  description: string;
  status: CrisisPlanStatus;
  scenario: string;
  severity: string;
  spokesperson: string;
  audience: string;
  approvalDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisMessage {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CrisisMessageType;
  description: string;
  status: CrisisMessageStatus;
  planId: string | null;
  channel: string;
  audience: string;
  message: string;
  sentBy: string;
  sentDate: Date | null;
  feedback: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StakeholderCommunication {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: StakeholderCommunicationType;
  description: string;
  status: StakeholderCommunicationStatus;
  stakeholderGroup: string;
  contactMethod: string;
  message: string;
  sentBy: string;
  sentDate: Date | null;
  response: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaInquiry {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: MediaInquiryType;
  description: string;
  status: MediaInquiryStatus;
  outlet: string;
  journalist: string;
  deadline: Date | null;
  question: string;
  response: string;
  responseBy: string;
  responseDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrisisCommunicationMetrics {
  activePlans: number;
  sentMessages: number;
  activeCommunications: number;
  pendingInquiries: number;
  publishedMessages: number;
}

export interface CrisisCommunicationStats {
  planCount: number;
  messageCount: number;
  communicationCount: number;
  inquiryCount: number;
  byPlanType: Record<string, number>;
  byPlanStatus: Record<string, number>;
  byMessageType: Record<string, number>;
  byMessageStatus: Record<string, number>;
  byCommunicationType: Record<string, number>;
  byCommunicationStatus: Record<string, number>;
  byInquiryType: Record<string, number>;
  byInquiryStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateCrisisPlanInput {
  name: string;
  type: CrisisPlanType;
  description?: string;
  status?: CrisisPlanStatus;
  scenario?: string;
  severity?: string;
  spokesperson?: string;
  audience?: string;
  approvalDate?: string;
  notes?: string;
}

export interface UpdateCrisisPlanInput {
  name?: string;
  type?: CrisisPlanType;
  description?: string;
  status?: CrisisPlanStatus;
  scenario?: string;
  severity?: string;
  spokesperson?: string;
  audience?: string;
  approvalDate?: string;
  notes?: string;
}

export interface ListCrisisPlansOpts {
  type?: CrisisPlanType;
  status?: CrisisPlanStatus;
}

export interface CreateCrisisMessageInput {
  name: string;
  type: CrisisMessageType;
  description?: string;
  status?: CrisisMessageStatus;
  planId?: string;
  channel?: string;
  audience?: string;
  message?: string;
  sentBy?: string;
  sentDate?: string;
  feedback?: string;
  notes?: string;
}

export interface UpdateCrisisMessageInput {
  name?: string;
  type?: CrisisMessageType;
  description?: string;
  status?: CrisisMessageStatus;
  planId?: string;
  channel?: string;
  audience?: string;
  message?: string;
  sentBy?: string;
  sentDate?: string;
  feedback?: string;
  notes?: string;
}

export interface ListCrisisMessagesOpts {
  type?: CrisisMessageType;
  status?: CrisisMessageStatus;
  planId?: string;
}

export interface CreateStakeholderCommunicationInput {
  name: string;
  type: StakeholderCommunicationType;
  description?: string;
  status?: StakeholderCommunicationStatus;
  stakeholderGroup?: string;
  contactMethod?: string;
  message?: string;
  sentBy?: string;
  sentDate?: string;
  response?: string;
  notes?: string;
}

export interface UpdateStakeholderCommunicationInput {
  name?: string;
  type?: StakeholderCommunicationType;
  description?: string;
  status?: StakeholderCommunicationStatus;
  stakeholderGroup?: string;
  contactMethod?: string;
  message?: string;
  sentBy?: string;
  sentDate?: string;
  response?: string;
  notes?: string;
}

export interface ListStakeholderCommunicationsOpts {
  type?: StakeholderCommunicationType;
  status?: StakeholderCommunicationStatus;
}

export interface CreateMediaInquiryInput {
  name: string;
  type: MediaInquiryType;
  description?: string;
  status?: MediaInquiryStatus;
  outlet?: string;
  journalist?: string;
  deadline?: string;
  question?: string;
  response?: string;
  responseBy?: string;
  responseDate?: string;
  notes?: string;
}

export interface UpdateMediaInquiryInput {
  name?: string;
  type?: MediaInquiryType;
  description?: string;
  status?: MediaInquiryStatus;
  outlet?: string;
  journalist?: string;
  deadline?: string;
  question?: string;
  response?: string;
  responseBy?: string;
  responseDate?: string;
  notes?: string;
}

export interface ListMediaInquiriesOpts {
  type?: MediaInquiryType;
  status?: MediaInquiryStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toCrisisPlan(row: MemoryRow): CrisisPlan {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CrisisPlanType) ?? 'operational',
    description: (c.description as string) ?? '',
    status: (c.status as CrisisPlanStatus) ?? 'draft',
    scenario: (c.scenario as string) ?? '',
    severity: (c.severity as string) ?? '',
    spokesperson: (c.spokesperson as string) ?? '',
    audience: (c.audience as string) ?? '',
    approvalDate: c.approvalDate ? new Date(c.approvalDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCrisisMessage(row: MemoryRow): CrisisMessage {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CrisisMessageType) ?? 'initial_statement',
    description: (c.description as string) ?? '',
    status: (c.status as CrisisMessageStatus) ?? 'draft',
    planId: (c.planId as string) ?? null,
    channel: (c.channel as string) ?? '',
    audience: (c.audience as string) ?? '',
    message: (c.message as string) ?? '',
    sentBy: (c.sentBy as string) ?? '',
    sentDate: c.sentDate ? new Date(c.sentDate as string) : null,
    feedback: (c.feedback as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toStakeholderCommunication(row: MemoryRow): StakeholderCommunication {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as StakeholderCommunicationType) ?? 'employees',
    description: (c.description as string) ?? '',
    status: (c.status as StakeholderCommunicationStatus) ?? 'planned',
    stakeholderGroup: (c.stakeholderGroup as string) ?? '',
    contactMethod: (c.contactMethod as string) ?? '',
    message: (c.message as string) ?? '',
    sentBy: (c.sentBy as string) ?? '',
    sentDate: c.sentDate ? new Date(c.sentDate as string) : null,
    response: (c.response as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMediaInquiry(row: MemoryRow): MediaInquiry {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as MediaInquiryType) ?? 'press',
    description: (c.description as string) ?? '',
    status: (c.status as MediaInquiryStatus) ?? 'received',
    outlet: (c.outlet as string) ?? '',
    journalist: (c.journalist as string) ?? '',
    deadline: c.deadline ? new Date(c.deadline as string) : null,
    question: (c.question as string) ?? '',
    response: (c.response as string) ?? '',
    responseBy: (c.responseBy as string) ?? '',
    responseDate: c.responseDate ? new Date(c.responseDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const CrisisCommunicationService = {
  // ── Crisis Plans ──

  async createCrisisPlan(organizationId: string, workspaceId: string, input: CreateCrisisPlanInput, createdBy: string): Promise<CrisisPlan> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      scenario: input.scenario ?? '',
      severity: input.severity ?? '',
      spokesperson: input.spokesperson ?? '',
      audience: input.audience ?? '',
      approvalDate: input.approvalDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'crisis_plan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['crisis_plan', content.type, content.status]),
        createdBy,
      },
    });
    return toCrisisPlan(row as MemoryRow);
  },

  async getCrisisPlan(id: string): Promise<CrisisPlan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'crisis_plan') return null;
    return toCrisisPlan(row as MemoryRow);
  },

  async listCrisisPlans(organizationId: string, opts: ListCrisisPlansOpts = {}): Promise<CrisisPlan[]> {
    const where: Record<string, unknown> = { organizationId, type: 'crisis_plan' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCrisisPlan);
  },

  async updateCrisisPlan(id: string, input: UpdateCrisisPlanInput): Promise<CrisisPlan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scenario !== undefined && { scenario: input.scenario }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.spokesperson !== undefined && { spokesperson: input.spokesperson }),
      ...(input.audience !== undefined && { audience: input.audience }),
      ...(input.approvalDate !== undefined && { approvalDate: input.approvalDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['crisis_plan', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCrisisPlan(row as MemoryRow);
  },

  async deleteCrisisPlan(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveCrisisPlan(id: string, _approvedBy: string): Promise<CrisisPlan | null> {
    return CrisisCommunicationService.updateCrisisPlan(id, { status: 'approved', approvalDate: new Date().toISOString() });
  },

  async activateCrisisPlan(id: string, _activatedBy: string): Promise<CrisisPlan | null> {
    return CrisisCommunicationService.updateCrisisPlan(id, { status: 'active' });
  },

  async executeCrisisPlan(id: string, _executedBy: string): Promise<CrisisPlan | null> {
    return CrisisCommunicationService.updateCrisisPlan(id, { status: 'executed' });
  },

  async archiveCrisisPlan(id: string, _archivedBy: string): Promise<CrisisPlan | null> {
    return CrisisCommunicationService.updateCrisisPlan(id, { status: 'archived' });
  },

  // ── Crisis Messages ──

  async createCrisisMessage(organizationId: string, workspaceId: string, input: CreateCrisisMessageInput, createdBy: string): Promise<CrisisMessage> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      planId: input.planId ?? null,
      channel: input.channel ?? '',
      audience: input.audience ?? '',
      message: input.message ?? '',
      sentBy: input.sentBy ?? '',
      sentDate: input.sentDate ?? null,
      feedback: input.feedback ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'crisis_message',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['crisis_message', content.type, content.status]),
        createdBy,
      },
    });
    return toCrisisMessage(row as MemoryRow);
  },

  async getCrisisMessage(id: string): Promise<CrisisMessage | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'crisis_message') return null;
    return toCrisisMessage(row as MemoryRow);
  },

  async listCrisisMessages(organizationId: string, opts: ListCrisisMessagesOpts = {}): Promise<CrisisMessage[]> {
    const where: Record<string, unknown> = { organizationId, type: 'crisis_message' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.planId) conditions.push({ content: { contains: `"planId":"${opts.planId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCrisisMessage);
  },

  async updateCrisisMessage(id: string, input: UpdateCrisisMessageInput): Promise<CrisisMessage | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.planId !== undefined && { planId: input.planId }),
      ...(input.channel !== undefined && { channel: input.channel }),
      ...(input.audience !== undefined && { audience: input.audience }),
      ...(input.message !== undefined && { message: input.message }),
      ...(input.sentBy !== undefined && { sentBy: input.sentBy }),
      ...(input.sentDate !== undefined && { sentDate: input.sentDate }),
      ...(input.feedback !== undefined && { feedback: input.feedback }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['crisis_message', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCrisisMessage(row as MemoryRow);
  },

  async deleteCrisisMessage(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveCrisisMessage(id: string, _approvedBy: string): Promise<CrisisMessage | null> {
    return CrisisCommunicationService.updateCrisisMessage(id, { status: 'approved' });
  },

  async sendCrisisMessage(id: string, _sentBy: string): Promise<CrisisMessage | null> {
    return CrisisCommunicationService.updateCrisisMessage(id, { status: 'sent', sentDate: new Date().toISOString() });
  },

  async publishCrisisMessage(id: string, _publishedBy: string): Promise<CrisisMessage | null> {
    return CrisisCommunicationService.updateCrisisMessage(id, { status: 'published' });
  },

  async retractCrisisMessage(id: string, _retractedBy: string): Promise<CrisisMessage | null> {
    return CrisisCommunicationService.updateCrisisMessage(id, { status: 'retracted' });
  },

  // ── Stakeholder Communications ──

  async createStakeholderCommunication(organizationId: string, workspaceId: string, input: CreateStakeholderCommunicationInput, createdBy: string): Promise<StakeholderCommunication> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      stakeholderGroup: input.stakeholderGroup ?? '',
      contactMethod: input.contactMethod ?? '',
      message: input.message ?? '',
      sentBy: input.sentBy ?? '',
      sentDate: input.sentDate ?? null,
      response: input.response ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'stakeholder_communication',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['stakeholder_communication', content.type, content.status]),
        createdBy,
      },
    });
    return toStakeholderCommunication(row as MemoryRow);
  },

  async getStakeholderCommunication(id: string): Promise<StakeholderCommunication | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'stakeholder_communication') return null;
    return toStakeholderCommunication(row as MemoryRow);
  },

  async listStakeholderCommunications(organizationId: string, opts: ListStakeholderCommunicationsOpts = {}): Promise<StakeholderCommunication[]> {
    const where: Record<string, unknown> = { organizationId, type: 'stakeholder_communication' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toStakeholderCommunication);
  },

  async updateStakeholderCommunication(id: string, input: UpdateStakeholderCommunicationInput): Promise<StakeholderCommunication | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.stakeholderGroup !== undefined && { stakeholderGroup: input.stakeholderGroup }),
      ...(input.contactMethod !== undefined && { contactMethod: input.contactMethod }),
      ...(input.message !== undefined && { message: input.message }),
      ...(input.sentBy !== undefined && { sentBy: input.sentBy }),
      ...(input.sentDate !== undefined && { sentDate: input.sentDate }),
      ...(input.response !== undefined && { response: input.response }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['stakeholder_communication', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toStakeholderCommunication(row as MemoryRow);
  },

  async deleteStakeholderCommunication(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startStakeholderCommunication(id: string, _startedBy: string): Promise<StakeholderCommunication | null> {
    return CrisisCommunicationService.updateStakeholderCommunication(id, { status: 'in_progress' });
  },

  async sendStakeholderCommunication(id: string, _sentBy: string): Promise<StakeholderCommunication | null> {
    return CrisisCommunicationService.updateStakeholderCommunication(id, { status: 'sent', sentDate: new Date().toISOString() });
  },

  async completeStakeholderCommunication(id: string, _completedBy: string): Promise<StakeholderCommunication | null> {
    return CrisisCommunicationService.updateStakeholderCommunication(id, { status: 'completed' });
  },

  async cancelStakeholderCommunication(id: string, _cancelledBy: string): Promise<StakeholderCommunication | null> {
    return CrisisCommunicationService.updateStakeholderCommunication(id, { status: 'cancelled' });
  },

  // ── Media Inquiries ──

  async createMediaInquiry(organizationId: string, workspaceId: string, input: CreateMediaInquiryInput, createdBy: string): Promise<MediaInquiry> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'received',
      outlet: input.outlet ?? '',
      journalist: input.journalist ?? '',
      deadline: input.deadline ?? null,
      question: input.question ?? '',
      response: input.response ?? '',
      responseBy: input.responseBy ?? '',
      responseDate: input.responseDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'media_inquiry',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['media_inquiry', content.type, content.status]),
        createdBy,
      },
    });
    return toMediaInquiry(row as MemoryRow);
  },

  async getMediaInquiry(id: string): Promise<MediaInquiry | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'media_inquiry') return null;
    return toMediaInquiry(row as MemoryRow);
  },

  async listMediaInquiries(organizationId: string, opts: ListMediaInquiriesOpts = {}): Promise<MediaInquiry[]> {
    const where: Record<string, unknown> = { organizationId, type: 'media_inquiry' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toMediaInquiry);
  },

  async updateMediaInquiry(id: string, input: UpdateMediaInquiryInput): Promise<MediaInquiry | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.outlet !== undefined && { outlet: input.outlet }),
      ...(input.journalist !== undefined && { journalist: input.journalist }),
      ...(input.deadline !== undefined && { deadline: input.deadline }),
      ...(input.question !== undefined && { question: input.question }),
      ...(input.response !== undefined && { response: input.response }),
      ...(input.responseBy !== undefined && { responseBy: input.responseBy }),
      ...(input.responseDate !== undefined && { responseDate: input.responseDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['media_inquiry', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toMediaInquiry(row as MemoryRow);
  },

  async deleteMediaInquiry(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async respondMediaInquiry(id: string, _respondedBy: string): Promise<MediaInquiry | null> {
    return CrisisCommunicationService.updateMediaInquiry(id, { status: 'responding' });
  },

  async declineMediaInquiry(id: string, _declinedBy: string): Promise<MediaInquiry | null> {
    return CrisisCommunicationService.updateMediaInquiry(id, { status: 'declined' });
  },

  async escalateMediaInquiry(id: string, _escalatedBy: string): Promise<MediaInquiry | null> {
    return CrisisCommunicationService.updateMediaInquiry(id, { status: 'escalated' });
  },

  async completeMediaInquiry(id: string, _completedBy: string): Promise<MediaInquiry | null> {
    return CrisisCommunicationService.updateMediaInquiry(id, { status: 'responded', responseDate: new Date().toISOString() });
  },

  // ── Metrics & Stats ──

  async getCrisisCommunicationMetrics(organizationId: string): Promise<CrisisCommunicationMetrics> {
    const [plans, messages, communications, inquiries] = await Promise.all([
      CrisisCommunicationService.listCrisisPlans(organizationId),
      CrisisCommunicationService.listCrisisMessages(organizationId),
      CrisisCommunicationService.listStakeholderCommunications(organizationId),
      CrisisCommunicationService.listMediaInquiries(organizationId),
    ]);
    return {
      activePlans: plans.filter((p) => p.status === 'active').length,
      sentMessages: messages.filter((m) => m.status === 'sent').length,
      activeCommunications: communications.filter((c) => c.status === 'in_progress').length,
      pendingInquiries: inquiries.filter((i) => i.status === 'received' || i.status === 'responding').length,
      publishedMessages: messages.filter((m) => m.status === 'published').length,
    };
  },

  async getCrisisCommunicationStats(organizationId: string): Promise<CrisisCommunicationStats> {
    const [plans, messages, communications, inquiries] = await Promise.all([
      CrisisCommunicationService.listCrisisPlans(organizationId),
      CrisisCommunicationService.listCrisisMessages(organizationId),
      CrisisCommunicationService.listStakeholderCommunications(organizationId),
      CrisisCommunicationService.listMediaInquiries(organizationId),
    ]);
    const byPlanType: Record<string, number> = {};
    const byPlanStatus: Record<string, number> = {};
    const byMessageType: Record<string, number> = {};
    const byMessageStatus: Record<string, number> = {};
    const byCommunicationType: Record<string, number> = {};
    const byCommunicationStatus: Record<string, number> = {};
    const byInquiryType: Record<string, number> = {};
    const byInquiryStatus: Record<string, number> = {};
    for (const p of plans) { byPlanType[p.type] = (byPlanType[p.type] ?? 0) + 1; byPlanStatus[p.status] = (byPlanStatus[p.status] ?? 0) + 1; }
    for (const m of messages) { byMessageType[m.type] = (byMessageType[m.type] ?? 0) + 1; byMessageStatus[m.status] = (byMessageStatus[m.status] ?? 0) + 1; }
    for (const c of communications) { byCommunicationType[c.type] = (byCommunicationType[c.type] ?? 0) + 1; byCommunicationStatus[c.status] = (byCommunicationStatus[c.status] ?? 0) + 1; }
    for (const i of inquiries) { byInquiryType[i.type] = (byInquiryType[i.type] ?? 0) + 1; byInquiryStatus[i.status] = (byInquiryStatus[i.status] ?? 0) + 1; }
    return {
      planCount: plans.length,
      messageCount: messages.length,
      communicationCount: communications.length,
      inquiryCount: inquiries.length,
      byPlanType, byPlanStatus, byMessageType, byMessageStatus, byCommunicationType, byCommunicationStatus, byInquiryType, byInquiryStatus,
    };
  },
};
