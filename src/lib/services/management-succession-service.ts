import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PlanType = 'ceo' | 'c_suite' | 'vp' | 'director' | 'manager' | 'critical_role' | 'emergency' | 'long_term';
export type PlanStatus = 'draft' | 'active' | 'under_review' | 'approved' | 'executed' | 'archived' | 'cancelled';
export type CandidateType = 'internal' | 'external' | 'contractor' | 'consultant' | 'board_member';
export type CandidateStatus = 'identified' | 'in_development' | 'ready' | 'ready_now' | 'not_ready' | 'withdrawn' | 'placed';
export type CandidateRank = 'tier1' | 'tier2' | 'tier3' | 'backup';
export type TrackType = 'leadership' | 'technical' | 'functional' | 'cross_functional' | 'executive' | 'rotational';
export type TrackStatus = 'planned' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
export type ReviewType = 'annual' | 'quarterly' | 'semi_annual' | 'trigger_event' | 'emergency' | 'transition';
export type ReviewStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

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

export interface SuccessionPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: PlanType;
  description: string;
  status: PlanStatus;
  roleTitle: string;
  currentHolder: string;
  targetDate: Date | null;
  riskLevel: string;
  priority: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuccessionCandidate {
  id: string;
  organizationId: string;
  workspaceId: string;
  planId: string;
  name: string;
  type: CandidateType;
  description: string;
  status: CandidateStatus;
  rank: CandidateRank;
  currentRole: string;
  targetRole: string;
  readinessLevel: number;
  developmentNeeds: string[];
  strengths: string[];
  gaps: string[];
  mentor: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuccessionTrack {
  id: string;
  organizationId: string;
  workspaceId: string;
  candidateId: string;
  type: TrackType;
  description: string;
  status: TrackStatus;
  startDate: Date | null;
  endDate: Date | null;
  milestones: string[];
  certifications: string[];
  rotations: string[];
  mentor: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuccessionReview {
  id: string;
  organizationId: string;
  workspaceId: string;
  planId: string;
  type: ReviewType;
  description: string;
  status: ReviewStatus;
  scheduledDate: Date | null;
  completedDate: Date | null;
  reviewer: string;
  findings: string;
  recommendations: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManagementSuccessionMetrics {
  activePlans: number;
  readyCandidates: number;
  readyNowCandidates: number;
  inProgressTracks: number;
  overdueReviews: number;
}

export interface ManagementSuccessionStats {
  planCount: number;
  activePlanCount: number;
  candidateCount: number;
  readyCandidateCount: number;
  readyNowCandidateCount: number;
  trackCount: number;
  inProgressTrackCount: number;
  reviewCount: number;
  overdueReviewCount: number;
  byPlanType: Record<string, number>;
  byPlanStatus: Record<string, number>;
  byCandidateType: Record<string, number>;
  byCandidateStatus: Record<string, number>;
  byCandidateRank: Record<string, number>;
  byTrackType: Record<string, number>;
  byTrackStatus: Record<string, number>;
  byReviewType: Record<string, number>;
  byReviewStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePlanInput {
  title: string;
  type: PlanType;
  description?: string;
  status?: PlanStatus;
  roleTitle?: string;
  currentHolder?: string;
  targetDate?: string;
  riskLevel?: string;
  priority?: string;
  notes?: string;
}

export interface UpdatePlanInput {
  title?: string;
  type?: PlanType;
  description?: string;
  status?: PlanStatus;
  roleTitle?: string;
  currentHolder?: string;
  targetDate?: string;
  riskLevel?: string;
  priority?: string;
  notes?: string;
}

export interface ListPlansOpts {
  type?: PlanType;
  status?: PlanStatus;
}

export interface CreateCandidateInput {
  planId: string;
  name: string;
  type: CandidateType;
  description?: string;
  status?: CandidateStatus;
  rank?: CandidateRank;
  currentRole?: string;
  targetRole?: string;
  readinessLevel?: number;
  developmentNeeds?: string[];
  strengths?: string[];
  gaps?: string[];
  mentor?: string;
  notes?: string;
}

export interface UpdateCandidateInput {
  planId?: string;
  name?: string;
  type?: CandidateType;
  description?: string;
  status?: CandidateStatus;
  rank?: CandidateRank;
  currentRole?: string;
  targetRole?: string;
  readinessLevel?: number;
  developmentNeeds?: string[];
  strengths?: string[];
  gaps?: string[];
  mentor?: string;
  notes?: string;
}

export interface ListCandidatesOpts {
  planId?: string;
  type?: CandidateType;
  status?: CandidateStatus;
  rank?: CandidateRank;
}

export interface CreateTrackInput {
  candidateId: string;
  type: TrackType;
  description?: string;
  status?: TrackStatus;
  startDate?: string;
  endDate?: string;
  milestones?: string[];
  certifications?: string[];
  rotations?: string[];
  mentor?: string;
  notes?: string;
}

export interface UpdateTrackInput {
  candidateId?: string;
  type?: TrackType;
  description?: string;
  status?: TrackStatus;
  startDate?: string;
  endDate?: string;
  milestones?: string[];
  certifications?: string[];
  rotations?: string[];
  mentor?: string;
  notes?: string;
}

export interface ListTracksOpts {
  candidateId?: string;
  type?: TrackType;
  status?: TrackStatus;
}

export interface CreateReviewInput {
  planId: string;
  type: ReviewType;
  description?: string;
  status?: ReviewStatus;
  scheduledDate?: string;
  completedDate?: string;
  reviewer?: string;
  findings?: string;
  recommendations?: string;
  notes?: string;
}

export interface UpdateReviewInput {
  planId?: string;
  type?: ReviewType;
  description?: string;
  status?: ReviewStatus;
  scheduledDate?: string;
  completedDate?: string;
  reviewer?: string;
  findings?: string;
  recommendations?: string;
  notes?: string;
}

export interface ListReviewsOpts {
  planId?: string;
  type?: ReviewType;
  status?: ReviewStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toPlan(row: MemoryRow): SuccessionPlan {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as PlanType) ?? 'long_term',
    description: (c.description as string) ?? '',
    status: (c.status as PlanStatus) ?? 'draft',
    roleTitle: (c.roleTitle as string) ?? '',
    currentHolder: (c.currentHolder as string) ?? '',
    targetDate: c.targetDate ? new Date(c.targetDate as string) : null,
    riskLevel: (c.riskLevel as string) ?? '',
    priority: (c.priority as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCandidate(row: MemoryRow): SuccessionCandidate {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    planId: (c.planId as string) ?? '',
    name: (c.name as string) ?? '',
    type: (c.type as CandidateType) ?? 'internal',
    description: (c.description as string) ?? '',
    status: (c.status as CandidateStatus) ?? 'identified',
    rank: (c.rank as CandidateRank) ?? 'tier2',
    currentRole: (c.currentRole as string) ?? '',
    targetRole: (c.targetRole as string) ?? '',
    readinessLevel: (c.readinessLevel as number) ?? 0,
    developmentNeeds: (c.developmentNeeds as string[]) ?? [],
    strengths: (c.strengths as string[]) ?? [],
    gaps: (c.gaps as string[]) ?? [],
    mentor: (c.mentor as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTrack(row: MemoryRow): SuccessionTrack {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    candidateId: (c.candidateId as string) ?? '',
    type: (c.type as TrackType) ?? 'leadership',
    description: (c.description as string) ?? '',
    status: (c.status as TrackStatus) ?? 'planned',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    milestones: (c.milestones as string[]) ?? [],
    certifications: (c.certifications as string[]) ?? [],
    rotations: (c.rotations as string[]) ?? [],
    mentor: (c.mentor as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toReview(row: MemoryRow): SuccessionReview {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    planId: (c.planId as string) ?? '',
    type: (c.type as ReviewType) ?? 'annual',
    description: (c.description as string) ?? '',
    status: (c.status as ReviewStatus) ?? 'scheduled',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    reviewer: (c.reviewer as string) ?? '',
    findings: (c.findings as string) ?? '',
    recommendations: (c.recommendations as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const ManagementSuccessionService = {
  // ── Plans ──

  async createPlan(organizationId: string, workspaceId: string, input: CreatePlanInput, createdBy: string): Promise<SuccessionPlan> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      roleTitle: input.roleTitle ?? '',
      currentHolder: input.currentHolder ?? '',
      targetDate: input.targetDate ?? null,
      riskLevel: input.riskLevel ?? '',
      priority: input.priority ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'succession_plan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['succession_plan', content.type, content.status]),
        createdBy,
      },
    });
    return toPlan(row as MemoryRow);
  },

  async getPlan(id: string): Promise<SuccessionPlan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'succession_plan') return null;
    return toPlan(row as MemoryRow);
  },

  async listPlans(organizationId: string, opts: ListPlansOpts = {}): Promise<SuccessionPlan[]> {
    const where: Record<string, unknown> = { organizationId, type: 'succession_plan' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPlan);
  },

  async updatePlan(id: string, input: UpdatePlanInput): Promise<SuccessionPlan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.roleTitle !== undefined && { roleTitle: input.roleTitle }),
      ...(input.currentHolder !== undefined && { currentHolder: input.currentHolder }),
      ...(input.targetDate !== undefined && { targetDate: input.targetDate }),
      ...(input.riskLevel !== undefined && { riskLevel: input.riskLevel }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['succession_plan', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPlan(row as MemoryRow);
  },

  async deletePlan(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activatePlan(id: string, _activatedBy: string): Promise<SuccessionPlan | null> {
    return ManagementSuccessionService.updatePlan(id, { status: 'active' });
  },

  async reviewPlan(id: string, _reviewedBy: string): Promise<SuccessionPlan | null> {
    return ManagementSuccessionService.updatePlan(id, { status: 'under_review' });
  },

  async approvePlan(id: string, _approvedBy: string): Promise<SuccessionPlan | null> {
    return ManagementSuccessionService.updatePlan(id, { status: 'approved' });
  },

  async executePlan(id: string, _executedBy: string): Promise<SuccessionPlan | null> {
    return ManagementSuccessionService.updatePlan(id, { status: 'executed' });
  },

  async archivePlan(id: string, _archivedBy: string): Promise<SuccessionPlan | null> {
    return ManagementSuccessionService.updatePlan(id, { status: 'archived' });
  },

  // ── Candidates ──

  async createCandidate(organizationId: string, workspaceId: string, input: CreateCandidateInput, createdBy: string): Promise<SuccessionCandidate> {
    const content = {
      planId: input.planId,
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'identified',
      rank: input.rank ?? 'tier2',
      currentRole: input.currentRole ?? '',
      targetRole: input.targetRole ?? '',
      readinessLevel: input.readinessLevel ?? 0,
      developmentNeeds: input.developmentNeeds ?? [],
      strengths: input.strengths ?? [],
      gaps: input.gaps ?? [],
      mentor: input.mentor ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'succession_candidate',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['succession_candidate', content.type, content.status, content.rank]),
        createdBy,
      },
    });
    return toCandidate(row as MemoryRow);
  },

  async getCandidate(id: string): Promise<SuccessionCandidate | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'succession_candidate') return null;
    return toCandidate(row as MemoryRow);
  },

  async listCandidates(organizationId: string, opts: ListCandidatesOpts = {}): Promise<SuccessionCandidate[]> {
    const where: Record<string, unknown> = { organizationId, type: 'succession_candidate' };
    const conditions: unknown[] = [];
    if (opts.planId) conditions.push({ content: { contains: `"planId":"${opts.planId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.rank) conditions.push({ content: { contains: `"rank":"${opts.rank}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCandidate);
  },

  async updateCandidate(id: string, input: UpdateCandidateInput): Promise<SuccessionCandidate | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.planId !== undefined && { planId: input.planId }),
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.rank !== undefined && { rank: input.rank }),
      ...(input.currentRole !== undefined && { currentRole: input.currentRole }),
      ...(input.targetRole !== undefined && { targetRole: input.targetRole }),
      ...(input.readinessLevel !== undefined && { readinessLevel: input.readinessLevel }),
      ...(input.developmentNeeds !== undefined && { developmentNeeds: input.developmentNeeds }),
      ...(input.strengths !== undefined && { strengths: input.strengths }),
      ...(input.gaps !== undefined && { gaps: input.gaps }),
      ...(input.mentor !== undefined && { mentor: input.mentor }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['succession_candidate', content.type, content.status, content.rank]) },
    }), null);
    if (!row) return null;
    return toCandidate(row as MemoryRow);
  },

  async deleteCandidate(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async developCandidate(id: string, _developedBy: string): Promise<SuccessionCandidate | null> {
    return ManagementSuccessionService.updateCandidate(id, { status: 'in_development' });
  },

  async readyCandidate(id: string, _readyBy: string): Promise<SuccessionCandidate | null> {
    return ManagementSuccessionService.updateCandidate(id, { status: 'ready' });
  },

  async readyNowCandidate(id: string, _readyBy: string): Promise<SuccessionCandidate | null> {
    return ManagementSuccessionService.updateCandidate(id, { status: 'ready_now' });
  },

  async notReadyCandidate(id: string, _markedBy: string): Promise<SuccessionCandidate | null> {
    return ManagementSuccessionService.updateCandidate(id, { status: 'not_ready' });
  },

  async withdrawCandidate(id: string, _withdrawnBy: string): Promise<SuccessionCandidate | null> {
    return ManagementSuccessionService.updateCandidate(id, { status: 'withdrawn' });
  },

  async placeCandidate(id: string, _placedBy: string): Promise<SuccessionCandidate | null> {
    return ManagementSuccessionService.updateCandidate(id, { status: 'placed' });
  },

  // ── Tracks ──

  async createTrack(organizationId: string, workspaceId: string, input: CreateTrackInput, createdBy: string): Promise<SuccessionTrack> {
    const content = {
      candidateId: input.candidateId,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      milestones: input.milestones ?? [],
      certifications: input.certifications ?? [],
      rotations: input.rotations ?? [],
      mentor: input.mentor ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'succession_track',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.candidateId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['succession_track', content.type, content.status]),
        createdBy,
      },
    });
    return toTrack(row as MemoryRow);
  },

  async getTrack(id: string): Promise<SuccessionTrack | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'succession_track') return null;
    return toTrack(row as MemoryRow);
  },

  async listTracks(organizationId: string, opts: ListTracksOpts = {}): Promise<SuccessionTrack[]> {
    const where: Record<string, unknown> = { organizationId, type: 'succession_track' };
    const conditions: unknown[] = [];
    if (opts.candidateId) conditions.push({ content: { contains: `"candidateId":"${opts.candidateId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTrack);
  },

  async updateTrack(id: string, input: UpdateTrackInput): Promise<SuccessionTrack | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.candidateId !== undefined && { candidateId: input.candidateId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.milestones !== undefined && { milestones: input.milestones }),
      ...(input.certifications !== undefined && { certifications: input.certifications }),
      ...(input.rotations !== undefined && { rotations: input.rotations }),
      ...(input.mentor !== undefined && { mentor: input.mentor }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['succession_track', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toTrack(row as MemoryRow);
  },

  async deleteTrack(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startTrack(id: string, _startedBy: string): Promise<SuccessionTrack | null> {
    return ManagementSuccessionService.updateTrack(id, { status: 'in_progress' });
  },

  async completeTrack(id: string, _completedBy: string): Promise<SuccessionTrack | null> {
    return ManagementSuccessionService.updateTrack(id, { status: 'completed' });
  },

  async pauseTrack(id: string, _pausedBy: string): Promise<SuccessionTrack | null> {
    return ManagementSuccessionService.updateTrack(id, { status: 'paused' });
  },

  // ── Reviews ──

  async createReview(organizationId: string, workspaceId: string, input: CreateReviewInput, createdBy: string): Promise<SuccessionReview> {
    const content = {
      planId: input.planId,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      reviewer: input.reviewer ?? '',
      findings: input.findings ?? '',
      recommendations: input.recommendations ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'succession_review',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['succession_review', content.type, content.status]),
        createdBy,
      },
    });
    return toReview(row as MemoryRow);
  },

  async getReview(id: string): Promise<SuccessionReview | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'succession_review') return null;
    return toReview(row as MemoryRow);
  },

  async listReviews(organizationId: string, opts: ListReviewsOpts = {}): Promise<SuccessionReview[]> {
    const where: Record<string, unknown> = { organizationId, type: 'succession_review' };
    const conditions: unknown[] = [];
    if (opts.planId) conditions.push({ content: { contains: `"planId":"${opts.planId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toReview);
  },

  async updateReview(id: string, input: UpdateReviewInput): Promise<SuccessionReview | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.planId !== undefined && { planId: input.planId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.reviewer !== undefined && { reviewer: input.reviewer }),
      ...(input.findings !== undefined && { findings: input.findings }),
      ...(input.recommendations !== undefined && { recommendations: input.recommendations }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['succession_review', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toReview(row as MemoryRow);
  },

  async deleteReview(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startReview(id: string, _startedBy: string): Promise<SuccessionReview | null> {
    return ManagementSuccessionService.updateReview(id, { status: 'in_progress' });
  },

  async completeReview(id: string, _completedBy: string): Promise<SuccessionReview | null> {
    return ManagementSuccessionService.updateReview(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async overdueReview(id: string, _markedBy: string): Promise<SuccessionReview | null> {
    return ManagementSuccessionService.updateReview(id, { status: 'overdue' });
  },

  // ── Metrics & Stats ──

  async getManagementSuccessionMetrics(organizationId: string): Promise<ManagementSuccessionMetrics> {
    const [plans, candidates, tracks, reviews] = await Promise.all([
      ManagementSuccessionService.listPlans(organizationId),
      ManagementSuccessionService.listCandidates(organizationId),
      ManagementSuccessionService.listTracks(organizationId),
      ManagementSuccessionService.listReviews(organizationId),
    ]);
    const activePlans = plans.filter((p) => p.status === 'active').length;
    const readyCandidates = candidates.filter((c) => c.status === 'ready').length;
    const readyNowCandidates = candidates.filter((c) => c.status === 'ready_now').length;
    const inProgressTracks = tracks.filter((t) => t.status === 'in_progress').length;
    const overdueReviews = reviews.filter((r) => r.status === 'overdue').length;
    return { activePlans, readyCandidates, readyNowCandidates, inProgressTracks, overdueReviews };
  },

  async getManagementSuccessionStats(organizationId: string): Promise<ManagementSuccessionStats> {
    const [plans, candidates, tracks, reviews] = await Promise.all([
      ManagementSuccessionService.listPlans(organizationId),
      ManagementSuccessionService.listCandidates(organizationId),
      ManagementSuccessionService.listTracks(organizationId),
      ManagementSuccessionService.listReviews(organizationId),
    ]);
    const byPlanType: Record<string, number> = {};
    const byPlanStatus: Record<string, number> = {};
    const byCandidateType: Record<string, number> = {};
    const byCandidateStatus: Record<string, number> = {};
    const byCandidateRank: Record<string, number> = {};
    const byTrackType: Record<string, number> = {};
    const byTrackStatus: Record<string, number> = {};
    const byReviewType: Record<string, number> = {};
    const byReviewStatus: Record<string, number> = {};
    for (const p of plans) { byPlanType[p.type] = (byPlanType[p.type] ?? 0) + 1; byPlanStatus[p.status] = (byPlanStatus[p.status] ?? 0) + 1; }
    for (const c of candidates) { byCandidateType[c.type] = (byCandidateType[c.type] ?? 0) + 1; byCandidateStatus[c.status] = (byCandidateStatus[c.status] ?? 0) + 1; byCandidateRank[c.rank] = (byCandidateRank[c.rank] ?? 0) + 1; }
    for (const t of tracks) { byTrackType[t.type] = (byTrackType[t.type] ?? 0) + 1; byTrackStatus[t.status] = (byTrackStatus[t.status] ?? 0) + 1; }
    for (const r of reviews) { byReviewType[r.type] = (byReviewType[r.type] ?? 0) + 1; byReviewStatus[r.status] = (byReviewStatus[r.status] ?? 0) + 1; }
    return {
      planCount: plans.length,
      activePlanCount: plans.filter((p) => p.status === 'active').length,
      candidateCount: candidates.length,
      readyCandidateCount: candidates.filter((c) => c.status === 'ready').length,
      readyNowCandidateCount: candidates.filter((c) => c.status === 'ready_now').length,
      trackCount: tracks.length,
      inProgressTrackCount: tracks.filter((t) => t.status === 'in_progress').length,
      reviewCount: reviews.length,
      overdueReviewCount: reviews.filter((r) => r.status === 'overdue').length,
      byPlanType, byPlanStatus, byCandidateType, byCandidateStatus, byCandidateRank, byTrackType, byTrackStatus, byReviewType, byReviewStatus,
    };
  },
};
