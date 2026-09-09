import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'succession_plan',
    content: JSON.stringify({
      title: 'CEO Succession Plan',
      type: 'ceo',
      description: 'Plan for CEO transition',
      status: 'draft',
      roleTitle: 'CEO',
      currentHolder: 'Jane Doe',
      targetDate: '2028-01-01',
      riskLevel: 'high',
      priority: 'critical',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['succession_plan', 'ceo', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeCandidateRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'succession_candidate',
    content: JSON.stringify({
      planId: 'mem-1',
      name: 'Alice Smith',
      type: 'internal',
      description: 'Strong internal candidate',
      status: 'identified',
      rank: 'tier1',
      currentRole: 'VP Engineering',
      targetRole: 'CTO',
      readinessLevel: 60,
      developmentNeeds: ['Executive presence'],
      strengths: ['Technical depth'],
      gaps: ['Public speaking'],
      mentor: 'Jane Doe',
      notes: '',
    }),
    tags: JSON.stringify(['succession_candidate', 'internal', 'identified', 'tier1']),
    ...overrides,
  });
}

function makeTrackRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-t1',
    type: 'succession_track',
    content: JSON.stringify({
      candidateId: 'mem-c1',
      type: 'leadership',
      description: 'Leadership development track',
      status: 'planned',
      startDate: '2028-01-01',
      endDate: '2028-12-31',
      milestones: ['Complete MBA'],
      certifications: ['PMP'],
      rotations: ['Sales rotation'],
      mentor: 'Jane Doe',
      notes: '',
    }),
    tags: JSON.stringify(['succession_track', 'leadership', 'planned']),
    ...overrides,
  });
}

function makeReviewRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'succession_review',
    content: JSON.stringify({
      planId: 'mem-1',
      type: 'annual',
      description: 'Annual succession review',
      status: 'scheduled',
      scheduledDate: '2028-06-01',
      completedDate: null,
      reviewer: 'John Doe',
      findings: '',
      recommendations: '',
      notes: '',
    }),
    tags: JSON.stringify(['succession_review', 'annual', 'scheduled']),
    ...overrides,
  });
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
}

const { ManagementSuccessionService } = await import('@/lib/services/management-succession-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Plans
// ─────────────────────────────────────────────────────────────────────────────

describe('ManagementSuccessionService — Plans', () => {
  beforeEach(() => resetMock());

  it('creates a plan with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await ManagementSuccessionService.createPlan('org-1', 'ws-1', {
      title: 'CEO Plan', type: 'ceo',
    }, 'user-1');
    assert.equal(p.title, 'CEO Plan');
    assert.equal(p.status, 'draft');
    assert.equal(p.description, '');
    assert.equal(p.riskLevel, '');
  });

  it('creates a plan with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await ManagementSuccessionService.createPlan('org-1', 'ws-1', {
      title: 'CFO Succession', type: 'c_suite', description: 'CFO transition plan',
      status: 'active', roleTitle: 'CFO', currentHolder: 'Bob',
      targetDate: '2028-01-01', riskLevel: 'medium', priority: 'high', notes: 'Priority plan',
    }, 'user-1');
    assert.equal(p.title, 'CFO Succession');
    assert.equal(p.type, 'c_suite');
    assert.equal(p.roleTitle, 'CFO');
    assert.equal(p.currentHolder, 'Bob');
    assert.equal(p.status, 'active');
    assert.equal(p.priority, 'high');
  });

  it('gets a plan by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await ManagementSuccessionService.getPlan('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.title, 'CEO Succession Plan');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'succession_candidate' });
    const p = await ManagementSuccessionService.getPlan('mem-1');
    assert.equal(p, null);
  });

  it('returns null when plan not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await ManagementSuccessionService.getPlan('nope');
    assert.equal(p, null);
  });

  it('lists plans by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'succession_plan') return [makeRow()];
      return [];
    };
    const list = await ManagementSuccessionService.listPlans('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'CEO Succession Plan');
  });

  it('updates a plan', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await ManagementSuccessionService.updatePlan('mem-1', { status: 'active' });
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deletes a plan', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await ManagementSuccessionService.deletePlan('mem-1');
    assert.equal(ok, true);
  });

  it('activatePlan sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await ManagementSuccessionService.activatePlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('reviewPlan sets status to under_review', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await ManagementSuccessionService.reviewPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'under_review');
  });

  it('approvePlan sets status to approved', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await ManagementSuccessionService.approvePlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'approved');
  });

  it('executePlan sets status to executed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await ManagementSuccessionService.executePlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'executed');
  });

  it('archivePlan sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await ManagementSuccessionService.archivePlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Candidates
// ─────────────────────────────────────────────────────────────────────────────

describe('ManagementSuccessionService — Candidates', () => {
  beforeEach(() => resetMock());

  it('creates a candidate with defaults', async () => {
    memCreateImpl = async (args) => makeCandidateRow({ content: args.data.content as string });
    const c = await ManagementSuccessionService.createCandidate('org-1', 'ws-1', {
      planId: 'mem-1', name: 'Alice', type: 'internal',
    }, 'user-1');
    assert.equal(c.name, 'Alice');
    assert.equal(c.status, 'identified');
    assert.equal(c.rank, 'tier2');
    assert.equal(c.readinessLevel, 0);
  });

  it('creates a candidate with full input', async () => {
    memCreateImpl = async (args) => makeCandidateRow({ content: args.data.content as string });
    const c = await ManagementSuccessionService.createCandidate('org-1', 'ws-1', {
      planId: 'mem-1', name: 'Bob', type: 'external', description: 'External hire',
      status: 'in_development', rank: 'tier1', currentRole: 'Director', targetRole: 'VP',
      readinessLevel: 80, developmentNeeds: ['Strategy'], strengths: ['Leadership'],
      gaps: ['Domain knowledge'], mentor: 'Jane', notes: 'High potential',
    }, 'user-1');
    assert.equal(c.name, 'Bob');
    assert.equal(c.type, 'external');
    assert.equal(c.rank, 'tier1');
    assert.equal(c.readinessLevel, 80);
    assert.equal(c.mentor, 'Jane');
  });

  it('gets a candidate by id', async () => {
    memFindUniqueImpl = async () => makeCandidateRow();
    const c = await ManagementSuccessionService.getCandidate('mem-c1');
    assert.ok(c);
    assert.equal(c!.name, 'Alice Smith');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCandidateRow({ type: 'succession_plan' });
    const c = await ManagementSuccessionService.getCandidate('mem-c1');
    assert.equal(c, null);
  });

  it('lists candidates by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'succession_candidate') return [makeCandidateRow()];
      return [];
    };
    const list = await ManagementSuccessionService.listCandidates('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a candidate', async () => {
    memFindUniqueImpl = async () => makeCandidateRow();
    memUpdateImpl = async (args) => makeCandidateRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await ManagementSuccessionService.updateCandidate('mem-c1', { readinessLevel: 90 });
    assert.ok(c);
    assert.equal(c!.readinessLevel, 90);
  });

  it('deletes a candidate', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await ManagementSuccessionService.deleteCandidate('mem-c1');
    assert.equal(ok, true);
  });

  it('developCandidate sets status to in_development', async () => {
    memFindUniqueImpl = async () => makeCandidateRow();
    memUpdateImpl = async (args) => makeCandidateRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await ManagementSuccessionService.developCandidate('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'in_development');
  });

  it('readyCandidate sets status to ready', async () => {
    memFindUniqueImpl = async () => makeCandidateRow();
    memUpdateImpl = async (args) => makeCandidateRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await ManagementSuccessionService.readyCandidate('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'ready');
  });

  it('readyNowCandidate sets status to ready_now', async () => {
    memFindUniqueImpl = async () => makeCandidateRow();
    memUpdateImpl = async (args) => makeCandidateRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await ManagementSuccessionService.readyNowCandidate('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'ready_now');
  });

  it('notReadyCandidate sets status to not_ready', async () => {
    memFindUniqueImpl = async () => makeCandidateRow();
    memUpdateImpl = async (args) => makeCandidateRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await ManagementSuccessionService.notReadyCandidate('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'not_ready');
  });

  it('withdrawCandidate sets status to withdrawn', async () => {
    memFindUniqueImpl = async () => makeCandidateRow();
    memUpdateImpl = async (args) => makeCandidateRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await ManagementSuccessionService.withdrawCandidate('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'withdrawn');
  });

  it('placeCandidate sets status to placed', async () => {
    memFindUniqueImpl = async () => makeCandidateRow();
    memUpdateImpl = async (args) => makeCandidateRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await ManagementSuccessionService.placeCandidate('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'placed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Tracks
// ─────────────────────────────────────────────────────────────────────────────

describe('ManagementSuccessionService — Tracks', () => {
  beforeEach(() => resetMock());

  it('creates a track with defaults', async () => {
    memCreateImpl = async (args) => makeTrackRow({ content: args.data.content as string });
    const t = await ManagementSuccessionService.createTrack('org-1', 'ws-1', {
      candidateId: 'mem-c1', type: 'leadership',
    }, 'user-1');
    assert.equal(t.type, 'leadership');
    assert.equal(t.status, 'planned');
    assert.equal(t.milestones.length, 0);
  });

  it('creates a track with full input', async () => {
    memCreateImpl = async (args) => makeTrackRow({ content: args.data.content as string });
    const t = await ManagementSuccessionService.createTrack('org-1', 'ws-1', {
      candidateId: 'mem-c1', type: 'executive', description: 'Executive track',
      status: 'in_progress', startDate: '2028-01-01', endDate: '2028-12-31',
      milestones: ['MBA'], certifications: ['Six Sigma'], rotations: ['Finance'],
      mentor: 'Jane', notes: 'Fast track',
    }, 'user-1');
    assert.equal(t.type, 'executive');
    assert.equal(t.status, 'in_progress');
    assert.equal(t.milestones.length, 1);
    assert.equal(t.mentor, 'Jane');
  });

  it('gets a track by id', async () => {
    memFindUniqueImpl = async () => makeTrackRow();
    const t = await ManagementSuccessionService.getTrack('mem-t1');
    assert.ok(t);
    assert.equal(t!.type, 'leadership');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTrackRow({ type: 'succession_plan' });
    const t = await ManagementSuccessionService.getTrack('mem-t1');
    assert.equal(t, null);
  });

  it('lists tracks by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'succession_track') return [makeTrackRow()];
      return [];
    };
    const list = await ManagementSuccessionService.listTracks('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a track', async () => {
    memFindUniqueImpl = async () => makeTrackRow();
    memUpdateImpl = async (args) => makeTrackRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await ManagementSuccessionService.updateTrack('mem-t1', { status: 'in_progress' });
    assert.ok(t);
    assert.equal(t!.status, 'in_progress');
  });

  it('deletes a track', async () => {
    memDeleteImpl = async () => ({ id: 'mem-t1' });
    const ok = await ManagementSuccessionService.deleteTrack('mem-t1');
    assert.equal(ok, true);
  });

  it('startTrack sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeTrackRow();
    memUpdateImpl = async (args) => makeTrackRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await ManagementSuccessionService.startTrack('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'in_progress');
  });

  it('completeTrack sets status to completed', async () => {
    memFindUniqueImpl = async () => makeTrackRow();
    memUpdateImpl = async (args) => makeTrackRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await ManagementSuccessionService.completeTrack('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'completed');
  });

  it('pauseTrack sets status to paused', async () => {
    memFindUniqueImpl = async () => makeTrackRow();
    memUpdateImpl = async (args) => makeTrackRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await ManagementSuccessionService.pauseTrack('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'paused');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Reviews
// ─────────────────────────────────────────────────────────────────────────────

describe('ManagementSuccessionService — Reviews', () => {
  beforeEach(() => resetMock());

  it('creates a review with defaults', async () => {
    memCreateImpl = async (args) => makeReviewRow({ content: args.data.content as string });
    const r = await ManagementSuccessionService.createReview('org-1', 'ws-1', {
      planId: 'mem-1', type: 'annual',
    }, 'user-1');
    assert.equal(r.type, 'annual');
    assert.equal(r.status, 'scheduled');
    assert.equal(r.reviewer, '');
  });

  it('creates a review with full input', async () => {
    memCreateImpl = async (args) => makeReviewRow({ content: args.data.content as string });
    const r = await ManagementSuccessionService.createReview('org-1', 'ws-1', {
      planId: 'mem-1', type: 'quarterly', description: 'Q1 review',
      status: 'in_progress', scheduledDate: '2028-03-01', completedDate: '2028-04-01',
      reviewer: 'Jane', findings: 'On track', recommendations: 'Continue',
      notes: 'Good progress',
    }, 'user-1');
    assert.equal(r.type, 'quarterly');
    assert.equal(r.reviewer, 'Jane');
    assert.equal(r.findings, 'On track');
  });

  it('gets a review by id', async () => {
    memFindUniqueImpl = async () => makeReviewRow();
    const r = await ManagementSuccessionService.getReview('mem-r1');
    assert.ok(r);
    assert.equal(r!.type, 'annual');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeReviewRow({ type: 'succession_plan' });
    const r = await ManagementSuccessionService.getReview('mem-r1');
    assert.equal(r, null);
  });

  it('lists reviews by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'succession_review') return [makeReviewRow()];
      return [];
    };
    const list = await ManagementSuccessionService.listReviews('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a review', async () => {
    memFindUniqueImpl = async () => makeReviewRow();
    memUpdateImpl = async (args) => makeReviewRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await ManagementSuccessionService.updateReview('mem-r1', { findings: 'Updated' });
    assert.ok(r);
    assert.equal(r!.findings, 'Updated');
  });

  it('deletes a review', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await ManagementSuccessionService.deleteReview('mem-r1');
    assert.equal(ok, true);
  });

  it('startReview sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeReviewRow();
    memUpdateImpl = async (args) => makeReviewRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await ManagementSuccessionService.startReview('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'in_progress');
  });

  it('completeReview sets status to completed', async () => {
    memFindUniqueImpl = async () => makeReviewRow();
    memUpdateImpl = async (args) => makeReviewRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await ManagementSuccessionService.completeReview('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'completed');
  });

  it('overdueReview sets status to overdue', async () => {
    memFindUniqueImpl = async () => makeReviewRow();
    memUpdateImpl = async (args) => makeReviewRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await ManagementSuccessionService.overdueReview('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'overdue');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('ManagementSuccessionService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getManagementSuccessionMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'succession_plan') return [
        makeRow({ content: JSON.stringify({ title: 'P1', type: 'ceo', status: 'active', description: '', roleTitle: '', currentHolder: '', riskLevel: '', priority: '', notes: '' }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ title: 'P2', type: 'c_suite', status: 'draft', description: '', roleTitle: '', currentHolder: '', riskLevel: '', priority: '', notes: '' }) }),
      ];
      if (t === 'succession_candidate') return [
        makeCandidateRow({ content: JSON.stringify({ planId: 'p1', name: 'C1', type: 'internal', status: 'ready', rank: 'tier1', description: '', currentRole: '', targetRole: '', readinessLevel: 0, developmentNeeds: [], strengths: [], gaps: [], mentor: '', notes: '' }) }),
        makeCandidateRow({ id: 'c2', content: JSON.stringify({ planId: 'p1', name: 'C2', type: 'internal', status: 'ready_now', rank: 'tier2', description: '', currentRole: '', targetRole: '', readinessLevel: 0, developmentNeeds: [], strengths: [], gaps: [], mentor: '', notes: '' }) }),
      ];
      if (t === 'succession_track') return [
        makeTrackRow({ content: JSON.stringify({ candidateId: 'c1', type: 'leadership', status: 'in_progress', description: '', startDate: null, endDate: null, milestones: [], certifications: [], rotations: [], mentor: '', notes: '' }) }),
      ];
      if (t === 'succession_review') return [
        makeReviewRow({ content: JSON.stringify({ planId: 'p1', type: 'annual', status: 'overdue', description: '', scheduledDate: null, completedDate: null, reviewer: '', findings: '', recommendations: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await ManagementSuccessionService.getManagementSuccessionMetrics('org-1');
    assert.equal(m.activePlans, 1);
    assert.equal(m.readyCandidates, 1);
    assert.equal(m.readyNowCandidates, 1);
    assert.equal(m.inProgressTracks, 1);
    assert.equal(m.overdueReviews, 1);
  });

  it('getManagementSuccessionStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'succession_plan') return [makeRow()];
      if (t === 'succession_candidate') return [makeCandidateRow()];
      if (t === 'succession_track') return [makeTrackRow()];
      if (t === 'succession_review') return [makeReviewRow()];
      return [];
    };
    const s = await ManagementSuccessionService.getManagementSuccessionStats('org-1');
    assert.equal(s.planCount, 1);
    assert.equal(s.candidateCount, 1);
    assert.equal(s.trackCount, 1);
    assert.equal(s.reviewCount, 1);
    assert.equal(s.byPlanType['ceo'], 1);
    assert.equal(s.byPlanStatus['draft'], 1);
    assert.equal(s.byCandidateType['internal'], 1);
    assert.equal(s.byCandidateStatus['identified'], 1);
    assert.equal(s.byCandidateRank['tier1'], 1);
    assert.equal(s.byTrackType['leadership'], 1);
    assert.equal(s.byTrackStatus['planned'], 1);
    assert.equal(s.byReviewType['annual'], 1);
    assert.equal(s.byReviewStatus['scheduled'], 1);
  });
});
