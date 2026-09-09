import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type CampaignType = 'grassroots' | 'grass_tops' | 'direct_lobbying' | 'coalition' | 'media' | 'digital' | 'letter_writing' | 'phone_banking' | 'site_visit' | 'social_media';
export type CampaignStatus = 'draft' | 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
export type LobbyingType = 'direct' | 'grassroots' | 'coalition' | 'state' | 'federal' | 'local' | 'international' | 'regulatory';
export type LobbyingStatus = 'planned' | 'active' | 'completed' | 'cancelled' | 'on_hold';
export type PositionType = 'support' | 'oppose' | 'neutral' | 'monitor' | 'amend';
export type PositionStatus = 'draft' | 'published' | 'archived' | 'updated';
export type IssueArea = 'taxation' | 'healthcare' | 'environment' | 'labor' | 'trade' | 'technology' | 'finance' | 'energy' | 'education' | 'immigration' | 'defense' | 'infrastructure' | 'other';
export type ContributionType = 'pac' | 'direct' | 'independent_expenditure' | 'soft_money' | 'bundled' | 'in_kind';
export type ContributionStatus = 'pledged' | 'received' | 'disbursed' | 'cancelled' | 'refunded' | 'pending_approval';

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

export interface AdvocacyCampaign {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CampaignType;
  description: string;
  status: CampaignStatus;
  issueArea: string;
  targetOfficial: string;
  targetBody: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: number;
  coordinator: string;
  participants: string[];
  talkingPoints: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LobbyingActivity {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: LobbyingType;
  description: string;
  status: LobbyingStatus;
  issueArea: string;
  targetOfficial: string;
  targetBody: string;
  lobbyist: string;
  date: Date | null;
  duration: number;
  expenses: number;
  outcome: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyPosition {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: PositionType;
  issueArea: IssueArea;
  description: string;
  status: PositionStatus;
  billNumber: string;
  summary: string;
  rationale: string;
  recommendations: string;
  publishedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PacContribution {
  id: string;
  organizationId: string;
  workspaceId: string;
  recipient: string;
  type: ContributionType;
  amount: number;
  currency: string;
  description: string;
  status: ContributionStatus;
  date: Date | null;
  recipientType: string;
  committee: string;
  purpose: string;
  approvalRequired: boolean;
  approvedBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PoliticalAdvocacyMetrics {
  activeCampaigns: number;
  activeLobbying: number;
  publishedPositions: number;
  pendingContributions: number;
  totalContributionAmount: number;
}

export interface PoliticalAdvocacyStats {
  campaignCount: number;
  activeCampaignCount: number;
  lobbyingCount: number;
  activeLobbyingCount: number;
  positionCount: number;
  publishedPositionCount: number;
  contributionCount: number;
  pendingContributionCount: number;
  byCampaignType: Record<string, number>;
  byCampaignStatus: Record<string, number>;
  byLobbyingType: Record<string, number>;
  byLobbyingStatus: Record<string, number>;
  byPositionType: Record<string, number>;
  byPositionStatus: Record<string, number>;
  byContributionType: Record<string, number>;
  byContributionStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateCampaignInput {
  name: string;
  type: CampaignType;
  description?: string;
  status?: CampaignStatus;
  issueArea?: string;
  targetOfficial?: string;
  targetBody?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  coordinator?: string;
  participants?: string[];
  talkingPoints?: string;
  notes?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  type?: CampaignType;
  description?: string;
  status?: CampaignStatus;
  issueArea?: string;
  targetOfficial?: string;
  targetBody?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  coordinator?: string;
  participants?: string[];
  talkingPoints?: string;
  notes?: string;
}

export interface ListCampaignsOpts {
  type?: CampaignType;
  status?: CampaignStatus;
  issueArea?: IssueArea;
}

export interface CreateLobbyingInput {
  title: string;
  type: LobbyingType;
  description?: string;
  status?: LobbyingStatus;
  issueArea?: string;
  targetOfficial?: string;
  targetBody?: string;
  lobbyist?: string;
  date?: string;
  duration?: number;
  expenses?: number;
  outcome?: string;
  notes?: string;
}

export interface UpdateLobbyingInput {
  title?: string;
  type?: LobbyingType;
  description?: string;
  status?: LobbyingStatus;
  issueArea?: string;
  targetOfficial?: string;
  targetBody?: string;
  lobbyist?: string;
  date?: string;
  duration?: number;
  expenses?: number;
  outcome?: string;
  notes?: string;
}

export interface ListLobbyingOpts {
  type?: LobbyingType;
  status?: LobbyingStatus;
  issueArea?: IssueArea;
}

export interface CreatePositionInput {
  title: string;
  type: PositionType;
  issueArea: IssueArea;
  description?: string;
  status?: PositionStatus;
  billNumber?: string;
  summary?: string;
  rationale?: string;
  recommendations?: string;
  publishedDate?: string;
  notes?: string;
}

export interface UpdatePositionInput {
  title?: string;
  type?: PositionType;
  issueArea?: IssueArea;
  description?: string;
  status?: PositionStatus;
  billNumber?: string;
  summary?: string;
  rationale?: string;
  recommendations?: string;
  publishedDate?: string;
  notes?: string;
}

export interface ListPositionsOpts {
  type?: PositionType;
  issueArea?: IssueArea;
  status?: PositionStatus;
}

export interface CreateContributionInput {
  recipient: string;
  type: ContributionType;
  amount: number;
  currency?: string;
  description?: string;
  status?: ContributionStatus;
  date?: string;
  recipientType?: string;
  committee?: string;
  purpose?: string;
  approvalRequired?: boolean;
  approvedBy?: string;
  notes?: string;
}

export interface UpdateContributionInput {
  recipient?: string;
  type?: ContributionType;
  amount?: number;
  currency?: string;
  description?: string;
  status?: ContributionStatus;
  date?: string;
  recipientType?: string;
  committee?: string;
  purpose?: string;
  approvalRequired?: boolean;
  approvedBy?: string;
  notes?: string;
}

export interface ListContributionsOpts {
  type?: ContributionType;
  status?: ContributionStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toCampaign(row: MemoryRow): AdvocacyCampaign {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CampaignType) ?? 'grassroots',
    description: (c.description as string) ?? '',
    status: (c.status as CampaignStatus) ?? 'draft',
    issueArea: (c.issueArea as string) ?? '',
    targetOfficial: (c.targetOfficial as string) ?? '',
    targetBody: (c.targetBody as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    budget: (c.budget as number) ?? 0,
    coordinator: (c.coordinator as string) ?? '',
    participants: (c.participants as string[]) ?? [],
    talkingPoints: (c.talkingPoints as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toLobbying(row: MemoryRow): LobbyingActivity {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as LobbyingType) ?? 'direct',
    description: (c.description as string) ?? '',
    status: (c.status as LobbyingStatus) ?? 'planned',
    issueArea: (c.issueArea as string) ?? '',
    targetOfficial: (c.targetOfficial as string) ?? '',
    targetBody: (c.targetBody as string) ?? '',
    lobbyist: (c.lobbyist as string) ?? '',
    date: c.date ? new Date(c.date as string) : null,
    duration: (c.duration as number) ?? 0,
    expenses: (c.expenses as number) ?? 0,
    outcome: (c.outcome as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPosition(row: MemoryRow): PolicyPosition {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as PositionType) ?? 'neutral',
    issueArea: (c.issueArea as IssueArea) ?? 'other',
    description: (c.description as string) ?? '',
    status: (c.status as PositionStatus) ?? 'draft',
    billNumber: (c.billNumber as string) ?? '',
    summary: (c.summary as string) ?? '',
    rationale: (c.rationale as string) ?? '',
    recommendations: (c.recommendations as string) ?? '',
    publishedDate: c.publishedDate ? new Date(c.publishedDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toContribution(row: MemoryRow): PacContribution {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    recipient: (c.recipient as string) ?? '',
    type: (c.type as ContributionType) ?? 'pac',
    amount: (c.amount as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    description: (c.description as string) ?? '',
    status: (c.status as ContributionStatus) ?? 'pending_approval',
    date: c.date ? new Date(c.date as string) : null,
    recipientType: (c.recipientType as string) ?? '',
    committee: (c.committee as string) ?? '',
    purpose: (c.purpose as string) ?? '',
    approvalRequired: (c.approvalRequired as boolean) ?? false,
    approvedBy: (c.approvedBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const PoliticalAdvocacyService = {
  // ── Campaigns ──

  async createCampaign(organizationId: string, workspaceId: string, input: CreateCampaignInput, createdBy: string): Promise<AdvocacyCampaign> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      issueArea: input.issueArea ?? '',
      targetOfficial: input.targetOfficial ?? '',
      targetBody: input.targetBody ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      budget: input.budget ?? 0,
      coordinator: input.coordinator ?? '',
      participants: input.participants ?? [],
      talkingPoints: input.talkingPoints ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'advocacy_campaign',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['advocacy_campaign', content.type, content.status, content.issueArea]),
        createdBy,
      },
    });
    return toCampaign(row as MemoryRow);
  },

  async getCampaign(id: string): Promise<AdvocacyCampaign | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'advocacy_campaign') return null;
    return toCampaign(row as MemoryRow);
  },

  async listCampaigns(organizationId: string, opts: ListCampaignsOpts = {}): Promise<AdvocacyCampaign[]> {
    const where: Record<string, unknown> = { organizationId, type: 'advocacy_campaign' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.issueArea) conditions.push({ content: { contains: `"issueArea":"${opts.issueArea}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCampaign);
  },

  async updateCampaign(id: string, input: UpdateCampaignInput): Promise<AdvocacyCampaign | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.issueArea !== undefined && { issueArea: input.issueArea }),
      ...(input.targetOfficial !== undefined && { targetOfficial: input.targetOfficial }),
      ...(input.targetBody !== undefined && { targetBody: input.targetBody }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.coordinator !== undefined && { coordinator: input.coordinator }),
      ...(input.participants !== undefined && { participants: input.participants }),
      ...(input.talkingPoints !== undefined && { talkingPoints: input.talkingPoints }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['advocacy_campaign', content.type, content.status, content.issueArea]) },
    }), null);
    if (!row) return null;
    return toCampaign(row as MemoryRow);
  },

  async deleteCampaign(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async planCampaign(id: string, _plannedBy: string): Promise<AdvocacyCampaign | null> {
    return PoliticalAdvocacyService.updateCampaign(id, { status: 'planned' });
  },

  async activateCampaign(id: string, _activatedBy: string): Promise<AdvocacyCampaign | null> {
    return PoliticalAdvocacyService.updateCampaign(id, { status: 'active' });
  },

  async pauseCampaign(id: string, _pausedBy: string): Promise<AdvocacyCampaign | null> {
    return PoliticalAdvocacyService.updateCampaign(id, { status: 'paused' });
  },

  async completeCampaign(id: string, _completedBy: string): Promise<AdvocacyCampaign | null> {
    return PoliticalAdvocacyService.updateCampaign(id, { status: 'completed' });
  },

  // ── Lobbying ──

  async createLobbying(organizationId: string, workspaceId: string, input: CreateLobbyingInput, createdBy: string): Promise<LobbyingActivity> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      issueArea: input.issueArea ?? '',
      targetOfficial: input.targetOfficial ?? '',
      targetBody: input.targetBody ?? '',
      lobbyist: input.lobbyist ?? '',
      date: input.date ?? null,
      duration: input.duration ?? 0,
      expenses: input.expenses ?? 0,
      outcome: input.outcome ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'lobbying_activity',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lobbying_activity', content.type, content.status, content.issueArea]),
        createdBy,
      },
    });
    return toLobbying(row as MemoryRow);
  },

  async getLobbying(id: string): Promise<LobbyingActivity | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lobbying_activity') return null;
    return toLobbying(row as MemoryRow);
  },

  async listLobbying(organizationId: string, opts: ListLobbyingOpts = {}): Promise<LobbyingActivity[]> {
    const where: Record<string, unknown> = { organizationId, type: 'lobbying_activity' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.issueArea) conditions.push({ content: { contains: `"issueArea":"${opts.issueArea}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toLobbying);
  },

  async updateLobbying(id: string, input: UpdateLobbyingInput): Promise<LobbyingActivity | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.issueArea !== undefined && { issueArea: input.issueArea }),
      ...(input.targetOfficial !== undefined && { targetOfficial: input.targetOfficial }),
      ...(input.targetBody !== undefined && { targetBody: input.targetBody }),
      ...(input.lobbyist !== undefined && { lobbyist: input.lobbyist }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.expenses !== undefined && { expenses: input.expenses }),
      ...(input.outcome !== undefined && { outcome: input.outcome }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['lobbying_activity', content.type, content.status, content.issueArea]) },
    }), null);
    if (!row) return null;
    return toLobbying(row as MemoryRow);
  },

  async deleteLobbying(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateLobbying(id: string, _activatedBy: string): Promise<LobbyingActivity | null> {
    return PoliticalAdvocacyService.updateLobbying(id, { status: 'active' });
  },

  async completeLobbying(id: string, _completedBy: string): Promise<LobbyingActivity | null> {
    return PoliticalAdvocacyService.updateLobbying(id, { status: 'completed' });
  },

  async holdLobbying(id: string, _holdBy: string): Promise<LobbyingActivity | null> {
    return PoliticalAdvocacyService.updateLobbying(id, { status: 'on_hold' });
  },

  // ── Positions ──

  async createPosition(organizationId: string, workspaceId: string, input: CreatePositionInput, createdBy: string): Promise<PolicyPosition> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      issueArea: input.issueArea,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      billNumber: input.billNumber ?? '',
      summary: input.summary ?? '',
      rationale: input.rationale ?? '',
      recommendations: input.recommendations ?? '',
      publishedDate: input.publishedDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'policy_position',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['policy_position', content.type, content.status, content.issueArea]),
        createdBy,
      },
    });
    return toPosition(row as MemoryRow);
  },

  async getPosition(id: string): Promise<PolicyPosition | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'policy_position') return null;
    return toPosition(row as MemoryRow);
  },

  async listPositions(organizationId: string, opts: ListPositionsOpts = {}): Promise<PolicyPosition[]> {
    const where: Record<string, unknown> = { organizationId, type: 'policy_position' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.issueArea) conditions.push({ content: { contains: `"issueArea":"${opts.issueArea}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPosition);
  },

  async updatePosition(id: string, input: UpdatePositionInput): Promise<PolicyPosition | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.issueArea !== undefined && { issueArea: input.issueArea }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.billNumber !== undefined && { billNumber: input.billNumber }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.rationale !== undefined && { rationale: input.rationale }),
      ...(input.recommendations !== undefined && { recommendations: input.recommendations }),
      ...(input.publishedDate !== undefined && { publishedDate: input.publishedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['policy_position', content.type, content.status, content.issueArea]) },
    }), null);
    if (!row) return null;
    return toPosition(row as MemoryRow);
  },

  async deletePosition(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async publishPosition(id: string, _publishedBy: string): Promise<PolicyPosition | null> {
    return PoliticalAdvocacyService.updatePosition(id, { status: 'published', publishedDate: new Date().toISOString() });
  },

  async archivePosition(id: string, _archivedBy: string): Promise<PolicyPosition | null> {
    return PoliticalAdvocacyService.updatePosition(id, { status: 'archived' });
  },

  async updatePositionStatus(id: string, _updatedBy: string): Promise<PolicyPosition | null> {
    return PoliticalAdvocacyService.updatePosition(id, { status: 'updated' });
  },

  // ── Contributions ──

  async createContribution(organizationId: string, workspaceId: string, input: CreateContributionInput, createdBy: string): Promise<PacContribution> {
    const content = {
      recipient: input.recipient.trim(),
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      description: input.description ?? '',
      status: input.status ?? 'pending_approval',
      date: input.date ?? null,
      recipientType: input.recipientType ?? '',
      committee: input.committee ?? '',
      purpose: input.purpose ?? '',
      approvalRequired: input.approvalRequired ?? false,
      approvedBy: input.approvedBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'pac_contribution',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['pac_contribution', content.type, content.status]),
        createdBy,
      },
    });
    return toContribution(row as MemoryRow);
  },

  async getContribution(id: string): Promise<PacContribution | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'pac_contribution') return null;
    return toContribution(row as MemoryRow);
  },

  async listContributions(organizationId: string, opts: ListContributionsOpts = {}): Promise<PacContribution[]> {
    const where: Record<string, unknown> = { organizationId, type: 'pac_contribution' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toContribution);
  },

  async updateContribution(id: string, input: UpdateContributionInput): Promise<PacContribution | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.recipient !== undefined && { recipient: input.recipient.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.recipientType !== undefined && { recipientType: input.recipientType }),
      ...(input.committee !== undefined && { committee: input.committee }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.approvalRequired !== undefined && { approvalRequired: input.approvalRequired }),
      ...(input.approvedBy !== undefined && { approvedBy: input.approvedBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['pac_contribution', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toContribution(row as MemoryRow);
  },

  async deleteContribution(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async pledgeContribution(id: string, _pledgedBy: string): Promise<PacContribution | null> {
    return PoliticalAdvocacyService.updateContribution(id, { status: 'pledged' });
  },

  async receiveContribution(id: string, _receivedBy: string): Promise<PacContribution | null> {
    return PoliticalAdvocacyService.updateContribution(id, { status: 'received' });
  },

  async disburseContribution(id: string, _disbursedBy: string): Promise<PacContribution | null> {
    return PoliticalAdvocacyService.updateContribution(id, { status: 'disbursed' });
  },

  async cancelContribution(id: string, _cancelledBy: string): Promise<PacContribution | null> {
    return PoliticalAdvocacyService.updateContribution(id, { status: 'cancelled' });
  },

  async refundContribution(id: string, _refundedBy: string): Promise<PacContribution | null> {
    return PoliticalAdvocacyService.updateContribution(id, { status: 'refunded' });
  },

  async approveContribution(id: string, approvedBy: string): Promise<PacContribution | null> {
    const c = await PoliticalAdvocacyService.updateContribution(id, { status: 'received', approvedBy });
    return c;
  },

  // ── Metrics & Stats ──

  async getPoliticalAdvocacyMetrics(organizationId: string): Promise<PoliticalAdvocacyMetrics> {
    const [campaigns, lobbying, positions, contributions] = await Promise.all([
      PoliticalAdvocacyService.listCampaigns(organizationId),
      PoliticalAdvocacyService.listLobbying(organizationId),
      PoliticalAdvocacyService.listPositions(organizationId),
      PoliticalAdvocacyService.listContributions(organizationId),
    ]);
    const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
    const activeLobbying = lobbying.filter((l) => l.status === 'active').length;
    const publishedPositions = positions.filter((p) => p.status === 'published').length;
    const pendingContributions = contributions.filter((c) => c.status === 'pending_approval').length;
    const totalContributionAmount = contributions.reduce((sum, c) => sum + c.amount, 0);
    return { activeCampaigns, activeLobbying, publishedPositions, pendingContributions, totalContributionAmount };
  },

  async getPoliticalAdvocacyStats(organizationId: string): Promise<PoliticalAdvocacyStats> {
    const [campaigns, lobbying, positions, contributions] = await Promise.all([
      PoliticalAdvocacyService.listCampaigns(organizationId),
      PoliticalAdvocacyService.listLobbying(organizationId),
      PoliticalAdvocacyService.listPositions(organizationId),
      PoliticalAdvocacyService.listContributions(organizationId),
    ]);
    const byCampaignType: Record<string, number> = {};
    const byCampaignStatus: Record<string, number> = {};
    const byLobbyingType: Record<string, number> = {};
    const byLobbyingStatus: Record<string, number> = {};
    const byPositionType: Record<string, number> = {};
    const byPositionStatus: Record<string, number> = {};
    const byContributionType: Record<string, number> = {};
    const byContributionStatus: Record<string, number> = {};
    for (const c of campaigns) { byCampaignType[c.type] = (byCampaignType[c.type] ?? 0) + 1; byCampaignStatus[c.status] = (byCampaignStatus[c.status] ?? 0) + 1; }
    for (const l of lobbying) { byLobbyingType[l.type] = (byLobbyingType[l.type] ?? 0) + 1; byLobbyingStatus[l.status] = (byLobbyingStatus[l.status] ?? 0) + 1; }
    for (const p of positions) { byPositionType[p.type] = (byPositionType[p.type] ?? 0) + 1; byPositionStatus[p.status] = (byPositionStatus[p.status] ?? 0) + 1; }
    for (const c of contributions) { byContributionType[c.type] = (byContributionType[c.type] ?? 0) + 1; byContributionStatus[c.status] = (byContributionStatus[c.status] ?? 0) + 1; }
    return {
      campaignCount: campaigns.length,
      activeCampaignCount: campaigns.filter((c) => c.status === 'active').length,
      lobbyingCount: lobbying.length,
      activeLobbyingCount: lobbying.filter((l) => l.status === 'active').length,
      positionCount: positions.length,
      publishedPositionCount: positions.filter((p) => p.status === 'published').length,
      contributionCount: contributions.length,
      pendingContributionCount: contributions.filter((c) => c.status === 'pending_approval').length,
      byCampaignType, byCampaignStatus, byLobbyingType, byLobbyingStatus, byPositionType, byPositionStatus, byContributionType, byContributionStatus,
    };
  },
};
