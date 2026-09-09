import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type OpportunityStatus = 'identified' | 'researching' | 'applying' | 'submitted' | 'awarded' | 'rejected' | 'withdrawn';
export type ApplicationStatus = 'draft' | 'in_review' | 'submitted' | 'under_review' | 'awarded' | 'rejected' | 'withdrawn';
export type AwardStatus = 'offered' | 'accepted' | 'active' | 'closed' | 'declined';
export type ReportType = 'progress' | 'final' | 'financial' | 'interim' | 'other';
export type ReportStatus = 'pending' | 'in_progress' | 'submitted' | 'overdue' | 'accepted';
export type DisbursementStatus = 'pending' | 'approved' | 'released' | 'rejected';

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

interface OpportunityContent {
  name: string;
  funder: string;
  program: string;
  eligibility: string;
  amount: number;
  deadline: string | null;
  status: OpportunityStatus;
  category: string;
  duration: string;
  matchScore: number;
  description: string;
}

interface ApplicationContent {
  opportunityId: string | null;
  title: string;
  funder: string;
  amountRequested: number;
  narrative: string;
  budget: string;
  timeline: string;
  team: string;
  status: ApplicationStatus;
  submittedDate: string | null;
  deadline: string | null;
  attachments: string[];
  submittedBy: string;
  withdrawnReason: string;
  withdrawnBy: string;
  withdrawnAt: string | null;
}

interface AwardContent {
  applicationId: string | null;
  title: string;
  funder: string;
  amountAwarded: number;
  startDate: string;
  endDate: string | null;
  conditions: string;
  reportingRequirements: string;
  status: AwardStatus;
  acceptedDate: string | null;
  acceptedBy: string;
  closedBy: string;
  closedAt: string | null;
  closeNotes: string;
}

interface ReportContent {
  awardId: string;
  type: ReportType;
  dueDate: string;
  submittedDate: string | null;
  status: ReportStatus;
  content: string;
  attachments: string[];
  findings: string;
  budgetUtilized: number | null;
  submittedBy: string;
}

interface DisbursementContent {
  awardId: string;
  amount: number;
  date: string;
  purpose: string;
  status: DisbursementStatus;
  restrictions: string;
  notes: string;
  approvedBy: string;
}

// ── Public interfaces ──

export interface GrantOpportunity {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  funder: string;
  program: string;
  eligibility: string;
  amount: number;
  deadline: Date | null;
  status: OpportunityStatus;
  category: string;
  duration: string;
  matchScore: number;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrantApplication {
  id: string;
  organizationId: string;
  workspaceId: string;
  opportunityId: string | null;
  title: string;
  funder: string;
  amountRequested: number;
  narrative: string;
  budget: string;
  timeline: string;
  team: string;
  status: ApplicationStatus;
  submittedDate: Date | null;
  deadline: Date | null;
  attachments: string[];
  submittedBy: string;
  withdrawnReason: string;
  withdrawnBy: string;
  withdrawnAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrantAward {
  id: string;
  organizationId: string;
  workspaceId: string;
  applicationId: string | null;
  title: string;
  funder: string;
  amountAwarded: number;
  startDate: Date;
  endDate: Date | null;
  conditions: string;
  reportingRequirements: string;
  status: AwardStatus;
  acceptedDate: Date | null;
  acceptedBy: string;
  closedBy: string;
  closedAt: Date | null;
  closeNotes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrantReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  awardId: string;
  type: ReportType;
  dueDate: Date;
  submittedDate: Date | null;
  status: ReportStatus;
  content: string;
  attachments: string[];
  findings: string;
  budgetUtilized: number | null;
  submittedBy: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrantDisbursement {
  id: string;
  organizationId: string;
  workspaceId: string;
  awardId: string;
  amount: number;
  date: Date;
  purpose: string;
  status: DisbursementStatus;
  restrictions: string;
  notes: string;
  approvedBy: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrantMetrics {
  totalAwarded: number;
  pendingApplications: number;
  reportComplianceRate: number;
  fundUtilization: number;
  upcomingDeadlines: number;
}

export interface GrantStats {
  opportunityCount: number;
  applicationCount: number;
  awardCount: number;
  activeAwardCount: number;
  reportCount: number;
  disbursementCount: number;
  totalAwarded: number;
  pendingApplicationCount: number;
  overdueReportCount: number;
  byOpportunityStatus: Record<string, number>;
  byApplicationStatus: Record<string, number>;
  byAwardStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateOpportunityInput {
  name: string;
  funder: string;
  program?: string;
  eligibility?: string;
  amount: number;
  deadline?: string;
  status?: OpportunityStatus;
  category?: string;
  duration?: string;
  matchScore?: number;
  description?: string;
}

export interface UpdateOpportunityInput {
  name?: string;
  funder?: string;
  program?: string;
  eligibility?: string;
  amount?: number;
  deadline?: string | null;
  status?: OpportunityStatus;
  category?: string;
  duration?: string;
  matchScore?: number;
  description?: string;
}

export interface ListOpportunitiesOpts {
  status?: OpportunityStatus;
  funder?: string;
  category?: string;
}

export interface CreateApplicationInput {
  opportunityId?: string;
  title: string;
  funder: string;
  amountRequested: number;
  narrative?: string;
  budget?: string;
  timeline?: string;
  team?: string;
  status?: ApplicationStatus;
  submittedDate?: string;
  deadline?: string;
  attachments?: string[];
}

export interface UpdateApplicationInput {
  opportunityId?: string;
  title?: string;
  funder?: string;
  amountRequested?: number;
  narrative?: string;
  budget?: string;
  timeline?: string;
  team?: string;
  status?: ApplicationStatus;
  submittedDate?: string;
  deadline?: string;
  attachments?: string[];
}

export interface ListApplicationsOpts {
  status?: ApplicationStatus;
  funder?: string;
}

export interface CreateAwardInput {
  applicationId?: string;
  title: string;
  funder: string;
  amountAwarded: number;
  startDate: string;
  endDate?: string;
  conditions?: string;
  reportingRequirements?: string;
  status?: AwardStatus;
  acceptedDate?: string;
}

export interface UpdateAwardInput {
  applicationId?: string;
  title?: string;
  funder?: string;
  amountAwarded?: number;
  startDate?: string;
  endDate?: string;
  conditions?: string;
  reportingRequirements?: string;
  status?: AwardStatus;
  acceptedDate?: string;
}

export interface ListAwardsOpts {
  status?: AwardStatus;
  funder?: string;
}

export interface CreateReportInput {
  awardId: string;
  type: ReportType;
  dueDate: string;
  submittedDate?: string;
  status?: ReportStatus;
  content?: string;
  attachments?: string[];
  findings?: string;
  budgetUtilized?: number;
}

export interface UpdateReportInput {
  type?: ReportType;
  dueDate?: string;
  submittedDate?: string;
  status?: ReportStatus;
  content?: string;
  attachments?: string[];
  findings?: string;
  budgetUtilized?: number;
}

export interface ListReportsOpts {
  awardId?: string;
  status?: ReportStatus;
  type?: ReportType;
}

export interface CreateDisbursementInput {
  awardId: string;
  amount: number;
  date: string;
  purpose?: string;
  status?: DisbursementStatus;
  restrictions?: string;
  notes?: string;
}

export interface UpdateDisbursementInput {
  amount?: number;
  date?: string;
  purpose?: string;
  status?: DisbursementStatus;
  restrictions?: string;
  notes?: string;
}

export interface ListDisbursementsOpts {
  awardId?: string;
  status?: DisbursementStatus;
}

// ── Helpers ──

const fallbackOpportunity: OpportunityContent = {
  name: '', funder: '', program: '', eligibility: '', amount: 0, deadline: null,
  status: 'identified', category: '', duration: '', matchScore: 0, description: '',
};

const fallbackApplication: ApplicationContent = {
  opportunityId: null, title: '', funder: '', amountRequested: 0, narrative: '', budget: '',
  timeline: '', team: '', status: 'draft', submittedDate: null, deadline: null, attachments: [],
  submittedBy: '', withdrawnReason: '', withdrawnBy: '', withdrawnAt: null,
};

const fallbackAward: AwardContent = {
  applicationId: null, title: '', funder: '', amountAwarded: 0, startDate: '', endDate: null,
  conditions: '', reportingRequirements: '', status: 'offered', acceptedDate: null, acceptedBy: '',
  closedBy: '', closedAt: null, closeNotes: '',
};

const fallbackReport: ReportContent = {
  awardId: '', type: 'progress', dueDate: '', submittedDate: null, status: 'pending',
  content: '', attachments: [], findings: '', budgetUtilized: null, submittedBy: '',
};

const fallbackDisbursement: DisbursementContent = {
  awardId: '', amount: 0, date: '', purpose: '', status: 'pending', restrictions: '', notes: '', approvedBy: '',
};

function parseOpportunity(raw: string): OpportunityContent {
  if (!raw) return fallbackOpportunity;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      funder: p.funder ?? '',
      program: p.program ?? '',
      eligibility: p.eligibility ?? '',
      amount: typeof p.amount === 'number' ? p.amount : 0,
      deadline: p.deadline ?? null,
      status: (p.status as OpportunityStatus) ?? 'identified',
      category: p.category ?? '',
      duration: p.duration ?? '',
      matchScore: typeof p.matchScore === 'number' ? p.matchScore : 0,
      description: p.description ?? '',
    };
  } catch { return fallbackOpportunity; }
}

function parseApplication(raw: string): ApplicationContent {
  if (!raw) return fallbackApplication;
  try {
    const p = JSON.parse(raw);
    return {
      opportunityId: p.opportunityId ?? null,
      title: p.title ?? '',
      funder: p.funder ?? '',
      amountRequested: typeof p.amountRequested === 'number' ? p.amountRequested : 0,
      narrative: p.narrative ?? '',
      budget: p.budget ?? '',
      timeline: p.timeline ?? '',
      team: p.team ?? '',
      status: (p.status as ApplicationStatus) ?? 'draft',
      submittedDate: p.submittedDate ?? null,
      deadline: p.deadline ?? null,
      attachments: Array.isArray(p.attachments) ? p.attachments : [],
      submittedBy: p.submittedBy ?? '',
      withdrawnReason: p.withdrawnReason ?? '',
      withdrawnBy: p.withdrawnBy ?? '',
      withdrawnAt: p.withdrawnAt ?? null,
    };
  } catch { return fallbackApplication; }
}

function parseAward(raw: string): AwardContent {
  if (!raw) return fallbackAward;
  try {
    const p = JSON.parse(raw);
    return {
      applicationId: p.applicationId ?? null,
      title: p.title ?? '',
      funder: p.funder ?? '',
      amountAwarded: typeof p.amountAwarded === 'number' ? p.amountAwarded : 0,
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? null,
      conditions: p.conditions ?? '',
      reportingRequirements: p.reportingRequirements ?? '',
      status: (p.status as AwardStatus) ?? 'offered',
      acceptedDate: p.acceptedDate ?? null,
      acceptedBy: p.acceptedBy ?? '',
      closedBy: p.closedBy ?? '',
      closedAt: p.closedAt ?? null,
      closeNotes: p.closeNotes ?? '',
    };
  } catch { return fallbackAward; }
}

function parseReport(raw: string): ReportContent {
  if (!raw) return fallbackReport;
  try {
    const p = JSON.parse(raw);
    return {
      awardId: p.awardId ?? '',
      type: (p.type as ReportType) ?? 'progress',
      dueDate: p.dueDate ?? '',
      submittedDate: p.submittedDate ?? null,
      status: (p.status as ReportStatus) ?? 'pending',
      content: p.content ?? '',
      attachments: Array.isArray(p.attachments) ? p.attachments : [],
      findings: p.findings ?? '',
      budgetUtilized: typeof p.budgetUtilized === 'number' ? p.budgetUtilized : null,
      submittedBy: p.submittedBy ?? '',
    };
  } catch { return fallbackReport; }
}

function parseDisbursement(raw: string): DisbursementContent {
  if (!raw) return fallbackDisbursement;
  try {
    const p = JSON.parse(raw);
    return {
      awardId: p.awardId ?? '',
      amount: typeof p.amount === 'number' ? p.amount : 0,
      date: p.date ?? '',
      purpose: p.purpose ?? '',
      status: (p.status as DisbursementStatus) ?? 'pending',
      restrictions: p.restrictions ?? '',
      notes: p.notes ?? '',
      approvedBy: p.approvedBy ?? '',
    };
  } catch { return fallbackDisbursement; }
}

function toOpportunity(row: MemoryRow): GrantOpportunity {
  const c = parseOpportunity(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, funder: c.funder, program: c.program, eligibility: c.eligibility,
    amount: c.amount, deadline: c.deadline ? new Date(c.deadline) : null,
    status: c.status, category: c.category, duration: c.duration, matchScore: c.matchScore,
    description: c.description, createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toApplication(row: MemoryRow): GrantApplication {
  const c = parseApplication(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    opportunityId: c.opportunityId, title: c.title, funder: c.funder,
    amountRequested: c.amountRequested, narrative: c.narrative, budget: c.budget,
    timeline: c.timeline, team: c.team, status: c.status,
    submittedDate: c.submittedDate ? new Date(c.submittedDate) : null,
    deadline: c.deadline ? new Date(c.deadline) : null,
    attachments: c.attachments, submittedBy: c.submittedBy,
    withdrawnReason: c.withdrawnReason, withdrawnBy: c.withdrawnBy,
    withdrawnAt: c.withdrawnAt ? new Date(c.withdrawnAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAward(row: MemoryRow): GrantAward {
  const c = parseAward(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    applicationId: c.applicationId, title: c.title, funder: c.funder,
    amountAwarded: c.amountAwarded,
    startDate: c.startDate ? new Date(c.startDate) : row.createdAt,
    endDate: c.endDate ? new Date(c.endDate) : null,
    conditions: c.conditions, reportingRequirements: c.reportingRequirements,
    status: c.status, acceptedDate: c.acceptedDate ? new Date(c.acceptedDate) : null,
    acceptedBy: c.acceptedBy, closedBy: c.closedBy,
    closedAt: c.closedAt ? new Date(c.closedAt) : null, closeNotes: c.closeNotes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toReport(row: MemoryRow): GrantReport {
  const c = parseReport(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    awardId: c.awardId, type: c.type,
    dueDate: c.dueDate ? new Date(c.dueDate) : row.createdAt,
    submittedDate: c.submittedDate ? new Date(c.submittedDate) : null,
    status: c.status, content: c.content, attachments: c.attachments,
    findings: c.findings, budgetUtilized: c.budgetUtilized, submittedBy: c.submittedBy,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDisbursement(row: MemoryRow): GrantDisbursement {
  const c = parseDisbursement(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    awardId: c.awardId, amount: c.amount,
    date: c.date ? new Date(c.date) : row.createdAt,
    purpose: c.purpose, status: c.status, restrictions: c.restrictions,
    notes: c.notes, approvedBy: c.approvedBy,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Grant Service ──

export const GrantService = {
  // ── Opportunities ──

  async createOpportunity(
    organizationId: string,
    workspaceId: string,
    input: CreateOpportunityInput,
    createdBy: string,
  ): Promise<GrantOpportunity> {
    const content: OpportunityContent = {
      name: input.name.trim(),
      funder: input.funder.trim(),
      program: input.program ?? '',
      eligibility: input.eligibility ?? '',
      amount: input.amount,
      deadline: input.deadline ?? null,
      status: input.status ?? 'identified',
      category: input.category ?? '',
      duration: input.duration ?? '',
      matchScore: input.matchScore ?? 0,
      description: input.description ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'grant_opportunity',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['grant_opportunity', content.status, content.category]),
        createdBy,
      },
    });

    return toOpportunity(row as MemoryRow);
  },

  async getOpportunity(id: string): Promise<GrantOpportunity | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'grant_opportunity') return null;
    return toOpportunity(row as MemoryRow);
  },

  async listOpportunities(organizationId: string, opts: ListOpportunitiesOpts = {}): Promise<GrantOpportunity[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'grant_opportunity', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toOpportunity(r as MemoryRow));
    if (opts.status) records = records.filter((o) => o.status === opts.status);
    if (opts.funder) records = records.filter((o) => o.funder === opts.funder);
    if (opts.category) records = records.filter((o) => o.category === opts.category);
    return records;
  },

  async updateOpportunity(id: string, input: UpdateOpportunityInput): Promise<GrantOpportunity | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseOpportunity(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.funder !== undefined) content.funder = input.funder.trim();
    if (input.program !== undefined) content.program = input.program;
    if (input.eligibility !== undefined) content.eligibility = input.eligibility;
    if (input.amount !== undefined) content.amount = input.amount;
    if (input.deadline !== undefined) content.deadline = input.deadline;
    if (input.status !== undefined) content.status = input.status;
    if (input.category !== undefined) content.category = input.category;
    if (input.duration !== undefined) content.duration = input.duration;
    if (input.matchScore !== undefined) content.matchScore = input.matchScore;
    if (input.description !== undefined) content.description = input.description;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['grant_opportunity', content.status, content.category]),
        },
      }), null,
    );
    if (!row) return null;
    return toOpportunity(row as MemoryRow);
  },

  async deleteOpportunity(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Applications ──

  async createApplication(
    organizationId: string,
    workspaceId: string,
    input: CreateApplicationInput,
    createdBy: string,
  ): Promise<GrantApplication> {
    const content: ApplicationContent = {
      opportunityId: input.opportunityId ?? null,
      title: input.title.trim(),
      funder: input.funder.trim(),
      amountRequested: input.amountRequested,
      narrative: input.narrative ?? '',
      budget: input.budget ?? '',
      timeline: input.timeline ?? '',
      team: input.team ?? '',
      status: input.status ?? 'draft',
      submittedDate: input.submittedDate ?? null,
      deadline: input.deadline ?? null,
      attachments: input.attachments ?? [],
      submittedBy: '', withdrawnReason: '', withdrawnBy: '', withdrawnAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'grant_application',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.opportunityId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['grant_application', content.status]),
        createdBy,
      },
    });

    return toApplication(row as MemoryRow);
  },

  async getApplication(id: string): Promise<GrantApplication | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'grant_application') return null;
    return toApplication(row as MemoryRow);
  },

  async listApplications(organizationId: string, opts: ListApplicationsOpts = {}): Promise<GrantApplication[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'grant_application', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toApplication(r as MemoryRow));
    if (opts.status) records = records.filter((a) => a.status === opts.status);
    if (opts.funder) records = records.filter((a) => a.funder === opts.funder);
    return records;
  },

  async updateApplication(id: string, input: UpdateApplicationInput): Promise<GrantApplication | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseApplication(existing.content);
    if (input.opportunityId !== undefined) content.opportunityId = input.opportunityId;
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.funder !== undefined) content.funder = input.funder.trim();
    if (input.amountRequested !== undefined) content.amountRequested = input.amountRequested;
    if (input.narrative !== undefined) content.narrative = input.narrative;
    if (input.budget !== undefined) content.budget = input.budget;
    if (input.timeline !== undefined) content.timeline = input.timeline;
    if (input.team !== undefined) content.team = input.team;
    if (input.status !== undefined) content.status = input.status;
    if (input.submittedDate !== undefined) content.submittedDate = input.submittedDate;
    if (input.deadline !== undefined) content.deadline = input.deadline;
    if (input.attachments !== undefined) content.attachments = input.attachments;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['grant_application', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toApplication(row as MemoryRow);
  },

  async submitApplication(id: string, submittedBy: string): Promise<GrantApplication | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseApplication(existing.content);
    content.status = 'submitted';
    content.submittedDate = new Date().toISOString();
    content.submittedBy = submittedBy;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['grant_application', 'submitted']),
        },
      }), null,
    );
    if (!row) return null;
    return toApplication(row as MemoryRow);
  },

  async withdrawApplication(id: string, reason: string, withdrawnBy: string): Promise<GrantApplication | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseApplication(existing.content);
    content.status = 'withdrawn';
    content.withdrawnReason = reason;
    content.withdrawnBy = withdrawnBy;
    content.withdrawnAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['grant_application', 'withdrawn']),
        },
      }), null,
    );
    if (!row) return null;
    return toApplication(row as MemoryRow);
  },

  // ── Awards ──

  async createAward(
    organizationId: string,
    workspaceId: string,
    input: CreateAwardInput,
    createdBy: string,
  ): Promise<GrantAward> {
    const content: AwardContent = {
      applicationId: input.applicationId ?? null,
      title: input.title.trim(),
      funder: input.funder.trim(),
      amountAwarded: input.amountAwarded,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      conditions: input.conditions ?? '',
      reportingRequirements: input.reportingRequirements ?? '',
      status: input.status ?? 'offered',
      acceptedDate: input.acceptedDate ?? null,
      acceptedBy: '', closedBy: '', closedAt: null, closeNotes: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'grant_award',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.applicationId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['grant_award', content.status]),
        createdBy,
      },
    });

    return toAward(row as MemoryRow);
  },

  async getAward(id: string): Promise<GrantAward | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'grant_award') return null;
    return toAward(row as MemoryRow);
  },

  async listAwards(organizationId: string, opts: ListAwardsOpts = {}): Promise<GrantAward[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'grant_award', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toAward(r as MemoryRow));
    if (opts.status) records = records.filter((a) => a.status === opts.status);
    if (opts.funder) records = records.filter((a) => a.funder === opts.funder);
    return records;
  },

  async updateAward(id: string, input: UpdateAwardInput): Promise<GrantAward | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAward(existing.content);
    if (input.applicationId !== undefined) content.applicationId = input.applicationId;
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.funder !== undefined) content.funder = input.funder.trim();
    if (input.amountAwarded !== undefined) content.amountAwarded = input.amountAwarded;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.conditions !== undefined) content.conditions = input.conditions;
    if (input.reportingRequirements !== undefined) content.reportingRequirements = input.reportingRequirements;
    if (input.status !== undefined) content.status = input.status;
    if (input.acceptedDate !== undefined) content.acceptedDate = input.acceptedDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['grant_award', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toAward(row as MemoryRow);
  },

  async acceptAward(id: string, acceptedBy: string): Promise<GrantAward | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAward(existing.content);
    content.status = 'accepted';
    content.acceptedBy = acceptedBy;
    content.acceptedDate = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['grant_award', 'accepted']),
        },
      }), null,
    );
    if (!row) return null;
    return toAward(row as MemoryRow);
  },

  async closeAward(id: string, closedBy: string, notes?: string): Promise<GrantAward | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAward(existing.content);
    content.status = 'closed';
    content.closedBy = closedBy;
    content.closedAt = new Date().toISOString();
    if (notes !== undefined) content.closeNotes = notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['grant_award', 'closed']),
        },
      }), null,
    );
    if (!row) return null;
    return toAward(row as MemoryRow);
  },

  // ── Reports ──

  async createReport(
    organizationId: string,
    workspaceId: string,
    input: CreateReportInput,
    createdBy: string,
  ): Promise<GrantReport> {
    const content: ReportContent = {
      awardId: input.awardId,
      type: input.type,
      dueDate: input.dueDate,
      submittedDate: input.submittedDate ?? null,
      status: input.status ?? 'pending',
      content: input.content ?? '',
      attachments: input.attachments ?? [],
      findings: input.findings ?? '',
      budgetUtilized: input.budgetUtilized ?? null,
      submittedBy: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'grant_report',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.awardId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['grant_report', content.type, content.status]),
        createdBy,
      },
    });

    return toReport(row as MemoryRow);
  },

  async getReport(id: string): Promise<GrantReport | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'grant_report') return null;
    return toReport(row as MemoryRow);
  },

  async listReports(organizationId: string, opts: ListReportsOpts = {}): Promise<GrantReport[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'grant_report', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toReport(r as MemoryRow));
    if (opts.awardId) records = records.filter((r) => r.awardId === opts.awardId);
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    if (opts.type) records = records.filter((r) => r.type === opts.type);
    return records;
  },

  async updateReport(id: string, input: UpdateReportInput): Promise<GrantReport | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseReport(existing.content);
    if (input.type !== undefined) content.type = input.type;
    if (input.dueDate !== undefined) content.dueDate = input.dueDate;
    if (input.submittedDate !== undefined) content.submittedDate = input.submittedDate;
    if (input.status !== undefined) content.status = input.status;
    if (input.content !== undefined) content.content = input.content;
    if (input.attachments !== undefined) content.attachments = input.attachments;
    if (input.findings !== undefined) content.findings = input.findings;
    if (input.budgetUtilized !== undefined) content.budgetUtilized = input.budgetUtilized;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['grant_report', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toReport(row as MemoryRow);
  },

  async submitReport(id: string, submittedBy: string, content?: string): Promise<GrantReport | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const c = parseReport(existing.content);
    c.status = 'submitted';
    c.submittedDate = new Date().toISOString();
    c.submittedBy = submittedBy;
    if (content !== undefined) c.content = content;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(c).slice(0, 50000),
          tags: JSON.stringify(['grant_report', c.type, 'submitted']),
        },
      }), null,
    );
    if (!row) return null;
    return toReport(row as MemoryRow);
  },

  // ── Disbursements ──

  async createDisbursement(
    organizationId: string,
    workspaceId: string,
    input: CreateDisbursementInput,
    createdBy: string,
  ): Promise<GrantDisbursement> {
    const content: DisbursementContent = {
      awardId: input.awardId,
      amount: input.amount,
      date: input.date,
      purpose: input.purpose ?? '',
      status: input.status ?? 'pending',
      restrictions: input.restrictions ?? '',
      notes: input.notes ?? '',
      approvedBy: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'grant_disbursement',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.awardId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['grant_disbursement', content.status]),
        createdBy,
      },
    });

    return toDisbursement(row as MemoryRow);
  },

  async getDisbursement(id: string): Promise<GrantDisbursement | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'grant_disbursement') return null;
    return toDisbursement(row as MemoryRow);
  },

  async listDisbursements(organizationId: string, opts: ListDisbursementsOpts = {}): Promise<GrantDisbursement[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'grant_disbursement', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toDisbursement(r as MemoryRow));
    if (opts.awardId) records = records.filter((d) => d.awardId === opts.awardId);
    if (opts.status) records = records.filter((d) => d.status === opts.status);
    return records;
  },

  async updateDisbursement(id: string, input: UpdateDisbursementInput): Promise<GrantDisbursement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDisbursement(existing.content);
    if (input.amount !== undefined) content.amount = input.amount;
    if (input.date !== undefined) content.date = input.date;
    if (input.purpose !== undefined) content.purpose = input.purpose;
    if (input.status !== undefined) content.status = input.status;
    if (input.restrictions !== undefined) content.restrictions = input.restrictions;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['grant_disbursement', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toDisbursement(row as MemoryRow);
  },

  async approveDisbursement(id: string, approvedBy: string): Promise<GrantDisbursement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDisbursement(existing.content);
    content.status = 'approved';
    content.approvedBy = approvedBy;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['grant_disbursement', 'approved']),
        },
      }), null,
    );
    if (!row) return null;
    return toDisbursement(row as MemoryRow);
  },

  // ── Metrics ──

  async getGrantMetrics(organizationId: string): Promise<GrantMetrics> {
    const [applications, awards, reports, disbursements, opportunities] = await Promise.all([
      GrantService.listApplications(organizationId),
      GrantService.listAwards(organizationId),
      GrantService.listReports(organizationId),
      GrantService.listDisbursements(organizationId),
      GrantService.listOpportunities(organizationId),
    ]);

    const activeAwards = awards.filter((a) => a.status === 'active' || a.status === 'accepted');
    const totalAwarded = activeAwards.reduce((sum, a) => sum + a.amountAwarded, 0);

    const pendingApplications = applications.filter(
      (a) => a.status === 'draft' || a.status === 'in_review' || a.status === 'submitted' || a.status === 'under_review',
    ).length;

    // Report compliance: submitted / total reports
    const submittedReports = reports.filter((r) => r.status === 'submitted' || r.status === 'accepted').length;
    const reportComplianceRate = reports.length > 0
      ? Math.round((submittedReports / reports.length) * 100)
      : 100;

    // Fund utilization: total disbursed / total awarded
    const totalDisbursed = disbursements
      .filter((d) => d.status === 'approved' || d.status === 'released')
      .reduce((sum, d) => sum + d.amount, 0);
    const fundUtilization = totalAwarded > 0
      ? Math.round((totalDisbursed / totalAwarded) * 100)
      : 0;

    // Upcoming deadlines (next 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = [
      ...opportunities.filter((o) => o.deadline && o.deadline >= now && o.deadline <= thirtyDaysFromNow),
      ...applications.filter((a) => a.deadline && a.deadline >= now && a.deadline <= thirtyDaysFromNow),
      ...reports.filter((r) => r.dueDate >= now && r.dueDate <= thirtyDaysFromNow && r.status !== 'submitted' && r.status !== 'accepted'),
    ].length;

    return {
      totalAwarded,
      pendingApplications,
      reportComplianceRate,
      fundUtilization,
      upcomingDeadlines,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<GrantStats> {
    const [opportunities, applications, awards, reports, disbursements, metrics] = await Promise.all([
      GrantService.listOpportunities(organizationId),
      GrantService.listApplications(organizationId),
      GrantService.listAwards(organizationId),
      GrantService.listReports(organizationId),
      GrantService.listDisbursements(organizationId),
      GrantService.getGrantMetrics(organizationId),
    ]);

    const byOpportunityStatus: Record<string, number> = {};
    for (const o of opportunities) {
      byOpportunityStatus[o.status] = (byOpportunityStatus[o.status] || 0) + 1;
    }

    const byApplicationStatus: Record<string, number> = {};
    let pendingApplicationCount = 0;
    for (const a of applications) {
      byApplicationStatus[a.status] = (byApplicationStatus[a.status] || 0) + 1;
      if (a.status === 'draft' || a.status === 'in_review' || a.status === 'submitted' || a.status === 'under_review') {
        pendingApplicationCount++;
      }
    }

    const byAwardStatus: Record<string, number> = {};
    let activeAwardCount = 0;
    for (const a of awards) {
      byAwardStatus[a.status] = (byAwardStatus[a.status] || 0) + 1;
      if (a.status === 'active' || a.status === 'accepted') activeAwardCount++;
    }

    const now = new Date();
    const overdueReportCount = reports.filter(
      (r) => r.dueDate < now && r.status !== 'submitted' && r.status !== 'accepted',
    ).length;

    return {
      opportunityCount: opportunities.length,
      applicationCount: applications.length,
      awardCount: awards.length,
      activeAwardCount,
      reportCount: reports.length,
      disbursementCount: disbursements.length,
      totalAwarded: metrics.totalAwarded,
      pendingApplicationCount,
      overdueReportCount,
      byOpportunityStatus,
      byApplicationStatus,
      byAwardStatus,
    };
  },
};
