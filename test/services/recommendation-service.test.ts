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
let memCountImpl: (args: FindManyArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: FindManyArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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
    type: 'recommendation',
    content: JSON.stringify({
      name: 'Next Action Recommendation',
      type: 'next_action',
      description: 'Recommended next action',
      status: 'generated',
      category: 'workflow',
      priority: 'high',
      confidence: 0.85,
      reasoning: 'Based on past performance',
      source: 'ml-model',
      target: 'task-1',
      targetId: null,
      expectedImpact: 'high',
      actualImpact: '',
      generatedAt: null,
      actedAt: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['recommendation', 'next_action', 'generated']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeFeedbackRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-f1',
    type: 'recommendation_feedback',
    content: JSON.stringify({
      name: 'Thumbs Up Feedback',
      type: 'thumbs_up',
      description: 'Positive feedback',
      status: 'recorded',
      recommendationId: 'mem-1',
      feedback: 'helpful',
      rating: 5,
      comment: 'Great recommendation',
      userId: 'user-2',
      recordedAt: null,
      notes: '',
    }),
    tags: JSON.stringify(['recommendation_feedback', 'thumbs_up', 'recorded']),
    ...overrides,
  });
}

function makeActionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-a1',
    type: 'recommendation_action',
    content: JSON.stringify({
      name: 'Apply Action',
      type: 'apply',
      description: 'Apply recommendation',
      status: 'planned',
      recommendationId: 'mem-1',
      action: 'implement',
      assignee: 'user-2',
      dueDate: '2028-02-01',
      result: '',
      completedAt: null,
      notes: '',
    }),
    tags: JSON.stringify(['recommendation_action', 'apply', 'planned']),
    ...overrides,
  });
}

function makeModelRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-m1',
    type: 'recommendation_model',
    content: JSON.stringify({
      name: 'Hybrid Model',
      type: 'hybrid',
      description: 'Hybrid recommendation model',
      status: 'draft',
      version: '1.0.0',
      accuracy: 0.92,
      precision: 0.88,
      recall: 0.85,
      lastTrained: null,
      trainingData: 'historical',
      config: '{"threshold":0.5}',
      notes: '',
    }),
    tags: JSON.stringify(['recommendation_model', 'hybrid', 'draft']),
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
  memCountImpl = async () => 0;
}

const { RecommendationService } = await import('@/lib/services/recommendation-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Recommendations
// ─────────────────────────────────────────────────────────────────────────────

describe('RecommendationService — Recommendations', () => {
  beforeEach(() => resetMock());

  it('creates a recommendation with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const r = await RecommendationService.createRecommendation('org-1', 'ws-1', {
      name: 'Optimization Recommendation', type: 'optimization',
    }, 'user-1');
    assert.equal(r.name, 'Optimization Recommendation');
    assert.equal(r.status, 'generated');
    assert.equal(r.confidence, 0);
  });

  it('creates a recommendation with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const r = await RecommendationService.createRecommendation('org-1', 'ws-1', {
      name: 'Alert Recommendation', type: 'alert', description: 'Critical alert',
      status: 'presented', category: 'safety', priority: 'critical', confidence: 0.95,
      reasoning: 'Threshold exceeded', source: 'monitor', target: 'alert-1',
      targetId: 'alert-1', expectedImpact: 'prevent incident', actualImpact: 'prevented',
      generatedAt: '2028-01-01', actedAt: '2028-01-02', notes: 'Acted on immediately',
    }, 'user-1');
    assert.equal(r.name, 'Alert Recommendation');
    assert.equal(r.type, 'alert');
    assert.equal(r.confidence, 0.95);
    assert.equal(r.priority, 'critical');
  });

  it('gets a recommendation by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const r = await RecommendationService.getRecommendation('mem-1');
    assert.ok(r);
    assert.equal(r!.id, 'mem-1');
    assert.equal(r!.name, 'Next Action Recommendation');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'recommendation_feedback' });
    const r = await RecommendationService.getRecommendation('mem-1');
    assert.equal(r, null);
  });

  it('returns null when recommendation not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await RecommendationService.getRecommendation('nope');
    assert.equal(r, null);
  });

  it('lists recommendations by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recommendation') return [makeRow()];
      return [];
    };
    const list = await RecommendationService.listRecommendations('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Next Action Recommendation');
  });

  it('updates a recommendation', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await RecommendationService.updateRecommendation('mem-1', { status: 'accepted' });
    assert.ok(r);
    assert.equal(r!.status, 'accepted');
  });

  it('deletes a recommendation', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await RecommendationService.deleteRecommendation('mem-1');
    assert.equal(ok, true);
  });

  it('presentRecommendation sets status to presented', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await RecommendationService.presentRecommendation('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'presented');
  });

  it('acceptRecommendation sets status to accepted', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await RecommendationService.acceptRecommendation('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'accepted');
  });

  it('rejectRecommendation sets status to rejected', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await RecommendationService.rejectRecommendation('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'rejected');
  });

  it('actRecommendation sets status to acted', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await RecommendationService.actRecommendation('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'acted');
  });

  it('dismissRecommendation sets status to dismissed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await RecommendationService.dismissRecommendation('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'dismissed');
  });

  it('archiveRecommendation sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await RecommendationService.archiveRecommendation('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Recommendation Feedback
// ─────────────────────────────────────────────────────────────────────────────

describe('RecommendationService — Recommendation Feedback', () => {
  beforeEach(() => resetMock());

  it('creates a recommendation feedback with defaults', async () => {
    memCreateImpl = async (args) => makeFeedbackRow({ content: args.data.content as string });
    const f = await RecommendationService.createRecommendationFeedback('org-1', 'ws-1', {
      name: 'Rating Feedback', type: 'rating',
    }, 'user-1');
    assert.equal(f.name, 'Rating Feedback');
    assert.equal(f.status, 'recorded');
    assert.equal(f.rating, 0);
  });

  it('creates a recommendation feedback with full input', async () => {
    memCreateImpl = async (args) => makeFeedbackRow({ content: args.data.content as string });
    const f = await RecommendationService.createRecommendationFeedback('org-1', 'ws-1', {
      name: 'Comment Feedback', type: 'comment', description: 'User comment feedback',
      status: 'reviewed', recommendationId: 'mem-2', feedback: 'needs improvement',
      rating: 3, comment: 'Could be better', userId: 'user-3',
      recordedAt: '2028-01-01', notes: 'Reviewed feedback',
    }, 'user-1');
    assert.equal(f.name, 'Comment Feedback');
    assert.equal(f.type, 'comment');
    assert.equal(f.rating, 3);
    assert.equal(f.recommendationId, 'mem-2');
  });

  it('gets a recommendation feedback by id', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow();
    const f = await RecommendationService.getRecommendationFeedback('mem-f1');
    assert.ok(f);
    assert.equal(f!.name, 'Thumbs Up Feedback');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow({ type: 'recommendation' });
    const f = await RecommendationService.getRecommendationFeedback('mem-f1');
    assert.equal(f, null);
  });

  it('returns null when recommendation feedback not found', async () => {
    memFindUniqueImpl = async () => null;
    const f = await RecommendationService.getRecommendationFeedback('nope');
    assert.equal(f, null);
  });

  it('lists recommendation feedbacks by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recommendation_feedback') return [makeFeedbackRow()];
      return [];
    };
    const list = await RecommendationService.listRecommendationFeedbacks('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a recommendation feedback', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow();
    memUpdateImpl = async (args) => makeFeedbackRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await RecommendationService.updateRecommendationFeedback('mem-f1', { status: 'reviewed' });
    assert.ok(f);
    assert.equal(f!.status, 'reviewed');
  });

  it('deletes a recommendation feedback', async () => {
    memDeleteImpl = async () => ({ id: 'mem-f1' });
    const ok = await RecommendationService.deleteRecommendationFeedback('mem-f1');
    assert.equal(ok, true);
  });

  it('recordFeedback sets status to recorded', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow();
    memUpdateImpl = async (args) => makeFeedbackRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await RecommendationService.recordFeedback('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'recorded');
  });

  it('reviewFeedback sets status to reviewed', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow();
    memUpdateImpl = async (args) => makeFeedbackRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await RecommendationService.reviewFeedback('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'reviewed');
  });

  it('incorporateFeedback sets status to incorporated', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow();
    memUpdateImpl = async (args) => makeFeedbackRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await RecommendationService.incorporateFeedback('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'incorporated');
  });

  it('archiveFeedback sets status to archived', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow();
    memUpdateImpl = async (args) => makeFeedbackRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await RecommendationService.archiveFeedback('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Recommendation Actions
// ─────────────────────────────────────────────────────────────────────────────

describe('RecommendationService — Recommendation Actions', () => {
  beforeEach(() => resetMock());

  it('creates a recommendation action with defaults', async () => {
    memCreateImpl = async (args) => makeActionRow({ content: args.data.content as string });
    const a = await RecommendationService.createRecommendationAction('org-1', 'ws-1', {
      name: 'Defer Action', type: 'defer',
    }, 'user-1');
    assert.equal(a.name, 'Defer Action');
    assert.equal(a.status, 'planned');
    assert.equal(a.assignee, '');
  });

  it('creates a recommendation action with full input', async () => {
    memCreateImpl = async (args) => makeActionRow({ content: args.data.content as string });
    const a = await RecommendationService.createRecommendationAction('org-1', 'ws-1', {
      name: 'Escalate Action', type: 'escalate', description: 'Escalate to management',
      status: 'in_progress', recommendationId: 'mem-2', action: 'notify_manager',
      assignee: 'manager', dueDate: '2028-02-15', result: 'pending',
      notes: 'Urgent escalation',
    }, 'user-1');
    assert.equal(a.name, 'Escalate Action');
    assert.equal(a.type, 'escalate');
    assert.equal(a.assignee, 'manager');
    assert.equal(a.recommendationId, 'mem-2');
  });

  it('gets a recommendation action by id', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    const a = await RecommendationService.getRecommendationAction('mem-a1');
    assert.ok(a);
    assert.equal(a!.name, 'Apply Action');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeActionRow({ type: 'recommendation' });
    const a = await RecommendationService.getRecommendationAction('mem-a1');
    assert.equal(a, null);
  });

  it('returns null when recommendation action not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await RecommendationService.getRecommendationAction('nope');
    assert.equal(a, null);
  });

  it('lists recommendation actions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recommendation_action') return [makeActionRow()];
      return [];
    };
    const list = await RecommendationService.listRecommendationActions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a recommendation action', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    memUpdateImpl = async (args) => makeActionRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await RecommendationService.updateRecommendationAction('mem-a1', { status: 'in_progress' });
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('deletes a recommendation action', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await RecommendationService.deleteRecommendationAction('mem-a1');
    assert.equal(ok, true);
  });

  it('startRecommendationAction sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    memUpdateImpl = async (args) => makeActionRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await RecommendationService.startRecommendationAction('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('completeRecommendationAction sets status to completed', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    memUpdateImpl = async (args) => makeActionRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await RecommendationService.completeRecommendationAction('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });

  it('failRecommendationAction sets status to failed', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    memUpdateImpl = async (args) => makeActionRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await RecommendationService.failRecommendationAction('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'failed');
  });

  it('cancelRecommendationAction sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    memUpdateImpl = async (args) => makeActionRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await RecommendationService.cancelRecommendationAction('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Recommendation Models
// ─────────────────────────────────────────────────────────────────────────────

describe('RecommendationService — Recommendation Models', () => {
  beforeEach(() => resetMock());

  it('creates a recommendation model with defaults', async () => {
    memCreateImpl = async (args) => makeModelRow({ content: args.data.content as string });
    const m = await RecommendationService.createRecommendationModel('org-1', 'ws-1', {
      name: 'Rule-Based Model', type: 'rule_based',
    }, 'user-1');
    assert.equal(m.name, 'Rule-Based Model');
    assert.equal(m.status, 'draft');
    assert.equal(m.accuracy, 0);
  });

  it('creates a recommendation model with full input', async () => {
    memCreateImpl = async (args) => makeModelRow({ content: args.data.content as string });
    const m = await RecommendationService.createRecommendationModel('org-1', 'ws-1', {
      name: 'ML Model', type: 'ml', description: 'Machine learning model',
      status: 'active', version: '2.0.0', accuracy: 0.95, precision: 0.91,
      recall: 0.88, lastTrained: '2028-01-01', trainingData: '100k samples',
      config: '{"epochs":50}', notes: 'Production model',
    }, 'user-1');
    assert.equal(m.name, 'ML Model');
    assert.equal(m.type, 'ml');
    assert.equal(m.accuracy, 0.95);
    assert.equal(m.version, '2.0.0');
  });

  it('gets a recommendation model by id', async () => {
    memFindUniqueImpl = async () => makeModelRow();
    const m = await RecommendationService.getRecommendationModel('mem-m1');
    assert.ok(m);
    assert.equal(m!.name, 'Hybrid Model');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeModelRow({ type: 'recommendation' });
    const m = await RecommendationService.getRecommendationModel('mem-m1');
    assert.equal(m, null);
  });

  it('returns null when recommendation model not found', async () => {
    memFindUniqueImpl = async () => null;
    const m = await RecommendationService.getRecommendationModel('nope');
    assert.equal(m, null);
  });

  it('lists recommendation models by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recommendation_model') return [makeModelRow()];
      return [];
    };
    const list = await RecommendationService.listRecommendationModels('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a recommendation model', async () => {
    memFindUniqueImpl = async () => makeModelRow();
    memUpdateImpl = async (args) => makeModelRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await RecommendationService.updateRecommendationModel('mem-m1', { status: 'active' });
    assert.ok(m);
    assert.equal(m!.status, 'active');
  });

  it('deletes a recommendation model', async () => {
    memDeleteImpl = async () => ({ id: 'mem-m1' });
    const ok = await RecommendationService.deleteRecommendationModel('mem-m1');
    assert.equal(ok, true);
  });

  it('activateRecommendationModel sets status to active', async () => {
    memFindUniqueImpl = async () => makeModelRow();
    memUpdateImpl = async (args) => makeModelRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await RecommendationService.activateRecommendationModel('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'active');
  });

  it('evaluateRecommendationModel sets status to evaluating', async () => {
    memFindUniqueImpl = async () => makeModelRow();
    memUpdateImpl = async (args) => makeModelRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await RecommendationService.evaluateRecommendationModel('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'evaluating');
  });

  it('deprecateRecommendationModel sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeModelRow();
    memUpdateImpl = async (args) => makeModelRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await RecommendationService.deprecateRecommendationModel('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'deprecated');
  });

  it('archiveRecommendationModel sets status to archived', async () => {
    memFindUniqueImpl = async () => makeModelRow();
    memUpdateImpl = async (args) => makeModelRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await RecommendationService.archiveRecommendationModel('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('RecommendationService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getRecommendationEngineMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recommendation') return [
        makeRow({ content: JSON.stringify({ name: 'R1', type: 'next_action', status: 'generated', description: '', category: '', priority: '', confidence: 0.8, reasoning: '', source: '', target: '', targetId: null, expectedImpact: '', actualImpact: '', generatedAt: null, actedAt: null, notes: '' }) }),
        makeRow({ id: 'r2', content: JSON.stringify({ name: 'R2', type: 'next_action', status: 'presented', description: '', category: '', priority: '', confidence: 0.7, reasoning: '', source: '', target: '', targetId: null, expectedImpact: '', actualImpact: '', generatedAt: null, actedAt: null, notes: '' }) }),
        makeRow({ id: 'r3', content: JSON.stringify({ name: 'R3', type: 'next_action', status: 'accepted', description: '', category: '', priority: '', confidence: 0.9, reasoning: '', source: '', target: '', targetId: null, expectedImpact: '', actualImpact: '', generatedAt: null, actedAt: null, notes: '' }) }),
        makeRow({ id: 'r4', content: JSON.stringify({ name: 'R4', type: 'next_action', status: 'acted', description: '', category: '', priority: '', confidence: 0.6, reasoning: '', source: '', target: '', targetId: null, expectedImpact: '', actualImpact: '', generatedAt: null, actedAt: null, notes: '' }) }),
      ];
      if (t === 'recommendation_model') return [
        makeModelRow({ content: JSON.stringify({ name: 'M1', type: 'hybrid', status: 'active', description: '', version: '', accuracy: 0, precision: 0, recall: 0, lastTrained: null, trainingData: '', config: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await RecommendationService.getRecommendationEngineMetrics('org-1');
    assert.equal(m.generatedRecommendations, 2);
    assert.equal(m.acceptedRecommendations, 1);
    assert.equal(m.actedRecommendations, 1);
    assert.equal(m.activeModels, 1);
    assert.ok(m.avgConfidence > 0);
  });

  it('getRecommendationEngineStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recommendation') return [makeRow()];
      if (t === 'recommendation_feedback') return [makeFeedbackRow()];
      if (t === 'recommendation_action') return [makeActionRow()];
      if (t === 'recommendation_model') return [makeModelRow()];
      return [];
    };
    const s = await RecommendationService.getRecommendationEngineStats('org-1');
    assert.equal(s.recommendationCount, 1);
    assert.equal(s.feedbackCount, 1);
    assert.equal(s.actionCount, 1);
    assert.equal(s.modelCount, 1);
    assert.equal(s.byRecommendationType['next_action'], 1);
    assert.equal(s.byFeedbackType['thumbs_up'], 1);
    assert.equal(s.byActionType['apply'], 1);
    assert.equal(s.byModelType['hybrid'], 1);
  });
});
