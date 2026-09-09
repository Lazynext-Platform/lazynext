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
    type: 'opportunity',
    content: JSON.stringify({
      name: 'Growth Opportunity',
      type: 'growth',
      description: 'Market expansion opportunity',
      status: 'detected',
      source: 'market_analysis',
      confidence: 0.8,
      impact: 7,
      effort: 5,
      score: 8,
      category: 'market',
      detectedBy: 'rule-1',
      detectedAt: null,
      evaluatedAt: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['opportunity', 'growth', 'detected']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeRuleRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'detection_rule',
    content: JSON.stringify({
      name: 'Threshold Rule',
      type: 'threshold',
      description: 'Revenue threshold detection',
      status: 'draft',
      rule: 'revenue > 100000',
      conditions: 'monthly',
      actions: 'alert',
      schedule: 'daily',
      lastTriggered: null,
      triggerCount: 0,
      notes: '',
    }),
    tags: JSON.stringify(['detection_rule', 'threshold', 'draft']),
    ...overrides,
  });
}

function makeScoreRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-s1',
    type: 'opportunity_score',
    content: JSON.stringify({
      name: 'Impact-Effort Score',
      type: 'impact_effort',
      description: 'Impact vs effort score',
      status: 'calculated',
      opportunityId: 'mem-1',
      criteria: 'impact,effort',
      weights: '0.6,0.4',
      scores: '7,5',
      total: 6.2,
      calculatedAt: null,
      calculatedBy: 'system',
      notes: '',
    }),
    tags: JSON.stringify(['opportunity_score', 'impact_effort', 'calculated']),
    ...overrides,
  });
}

function makeActionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-a1',
    type: 'opportunity_action',
    content: JSON.stringify({
      name: 'Investigate Action',
      type: 'investigate',
      description: 'Investigate growth opportunity',
      status: 'planned',
      opportunityId: 'mem-1',
      action: 'research',
      assignee: 'analyst',
      dueDate: '2028-02-01',
      priority: 'high',
      result: '',
      completedAt: null,
      notes: '',
    }),
    tags: JSON.stringify(['opportunity_action', 'investigate', 'planned']),
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

const { OpportunityService } = await import('@/lib/services/opportunity-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Opportunities
// ─────────────────────────────────────────────────────────────────────────────

describe('OpportunityService — Opportunities', () => {
  beforeEach(() => resetMock());

  it('creates an opportunity with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const o = await OpportunityService.createOpportunity('org-1', 'ws-1', {
      name: 'Cost Saving Opportunity', type: 'cost_saving',
    }, 'user-1');
    assert.equal(o.name, 'Cost Saving Opportunity');
    assert.equal(o.status, 'detected');
    assert.equal(o.impact, 0);
  });

  it('creates an opportunity with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const o = await OpportunityService.createOpportunity('org-1', 'ws-1', {
      name: 'Revenue Opportunity', type: 'revenue', description: 'New revenue stream',
      status: 'evaluating', source: 'sales_data', confidence: 0.9, impact: 9,
      effort: 3, score: 9.5, category: 'revenue', detectedBy: 'ml-model',
      detectedAt: '2028-01-15', evaluatedAt: '2028-01-16', notes: 'High priority',
    }, 'user-1');
    assert.equal(o.name, 'Revenue Opportunity');
    assert.equal(o.type, 'revenue');
    assert.equal(o.impact, 9);
    assert.equal(o.confidence, 0.9);
  });

  it('gets an opportunity by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const o = await OpportunityService.getOpportunity('mem-1');
    assert.ok(o);
    assert.equal(o!.id, 'mem-1');
    assert.equal(o!.name, 'Growth Opportunity');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'detection_rule' });
    const o = await OpportunityService.getOpportunity('mem-1');
    assert.equal(o, null);
  });

  it('returns null when opportunity not found', async () => {
    memFindUniqueImpl = async () => null;
    const o = await OpportunityService.getOpportunity('nope');
    assert.equal(o, null);
  });

  it('lists opportunities by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'opportunity') return [makeRow()];
      return [];
    };
    const list = await OpportunityService.listOpportunities('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Growth Opportunity');
  });

  it('updates an opportunity', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await OpportunityService.updateOpportunity('mem-1', { status: 'approved' });
    assert.ok(o);
    assert.equal(o!.status, 'approved');
  });

  it('deletes an opportunity', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await OpportunityService.deleteOpportunity('mem-1');
    assert.equal(ok, true);
  });

  it('evaluateOpportunity sets status to evaluating', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await OpportunityService.evaluateOpportunity('mem-1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'evaluating');
  });

  it('approveOpportunity sets status to approved', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await OpportunityService.approveOpportunity('mem-1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'approved');
  });

  it('rejectOpportunity sets status to rejected', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await OpportunityService.rejectOpportunity('mem-1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'rejected');
  });

  it('pursueOpportunity sets status to pursuing', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await OpportunityService.pursueOpportunity('mem-1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'pursuing');
  });

  it('realizeOpportunity sets status to realized', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await OpportunityService.realizeOpportunity('mem-1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'realized');
  });

  it('archiveOpportunity sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await OpportunityService.archiveOpportunity('mem-1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Detection Rules
// ─────────────────────────────────────────────────────────────────────────────

describe('OpportunityService — Detection Rules', () => {
  beforeEach(() => resetMock());

  it('creates a detection rule with defaults', async () => {
    memCreateImpl = async (args) => makeRuleRow({ content: args.data.content as string });
    const r = await OpportunityService.createDetectionRule('org-1', 'ws-1', {
      name: 'Pattern Rule', type: 'pattern',
    }, 'user-1');
    assert.equal(r.name, 'Pattern Rule');
    assert.equal(r.status, 'draft');
    assert.equal(r.triggerCount, 0);
  });

  it('creates a detection rule with full input', async () => {
    memCreateImpl = async (args) => makeRuleRow({ content: args.data.content as string });
    const r = await OpportunityService.createDetectionRule('org-1', 'ws-1', {
      name: 'Anomaly Rule', type: 'anomaly', description: 'Anomaly detection rule',
      status: 'active', rule: 'stddev > 3', conditions: 'weekly', actions: 'flag',
      schedule: 'hourly', lastTriggered: '2028-01-01', triggerCount: 5, notes: 'Active rule',
    }, 'user-1');
    assert.equal(r.name, 'Anomaly Rule');
    assert.equal(r.type, 'anomaly');
    assert.equal(r.triggerCount, 5);
    assert.equal(r.schedule, 'hourly');
  });

  it('gets a detection rule by id', async () => {
    memFindUniqueImpl = async () => makeRuleRow();
    const r = await OpportunityService.getDetectionRule('mem-r1');
    assert.ok(r);
    assert.equal(r!.name, 'Threshold Rule');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRuleRow({ type: 'opportunity' });
    const r = await OpportunityService.getDetectionRule('mem-r1');
    assert.equal(r, null);
  });

  it('returns null when detection rule not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await OpportunityService.getDetectionRule('nope');
    assert.equal(r, null);
  });

  it('lists detection rules by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'detection_rule') return [makeRuleRow()];
      return [];
    };
    const list = await OpportunityService.listDetectionRules('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a detection rule', async () => {
    memFindUniqueImpl = async () => makeRuleRow();
    memUpdateImpl = async (args) => makeRuleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await OpportunityService.updateDetectionRule('mem-r1', { status: 'active' });
    assert.ok(r);
    assert.equal(r!.status, 'active');
  });

  it('deletes a detection rule', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await OpportunityService.deleteDetectionRule('mem-r1');
    assert.equal(ok, true);
  });

  it('activateDetectionRule sets status to active', async () => {
    memFindUniqueImpl = async () => makeRuleRow();
    memUpdateImpl = async (args) => makeRuleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await OpportunityService.activateDetectionRule('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'active');
  });

  it('pauseDetectionRule sets status to paused', async () => {
    memFindUniqueImpl = async () => makeRuleRow();
    memUpdateImpl = async (args) => makeRuleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await OpportunityService.pauseDetectionRule('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'paused');
  });

  it('deprecateDetectionRule sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeRuleRow();
    memUpdateImpl = async (args) => makeRuleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await OpportunityService.deprecateDetectionRule('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'deprecated');
  });

  it('archiveDetectionRule sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRuleRow();
    memUpdateImpl = async (args) => makeRuleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await OpportunityService.archiveDetectionRule('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Opportunity Scores
// ─────────────────────────────────────────────────────────────────────────────

describe('OpportunityService — Opportunity Scores', () => {
  beforeEach(() => resetMock());

  it('creates an opportunity score with defaults', async () => {
    memCreateImpl = async (args) => makeScoreRow({ content: args.data.content as string });
    const s = await OpportunityService.createOpportunityScore('org-1', 'ws-1', {
      name: 'ROI Score', type: 'roi',
    }, 'user-1');
    assert.equal(s.name, 'ROI Score');
    assert.equal(s.status, 'calculated');
    assert.equal(s.total, 0);
  });

  it('creates an opportunity score with full input', async () => {
    memCreateImpl = async (args) => makeScoreRow({ content: args.data.content as string });
    const s = await OpportunityService.createOpportunityScore('org-1', 'ws-1', {
      name: 'Strategic Score', type: 'strategic', description: 'Strategic alignment score',
      status: 'reviewed', opportunityId: 'mem-2', criteria: 'alignment,feasibility',
      weights: '0.5,0.5', scores: '8,7', total: 7.5, calculatedAt: '2028-01-01',
      calculatedBy: 'analyst', notes: 'Reviewed score',
    }, 'user-1');
    assert.equal(s.name, 'Strategic Score');
    assert.equal(s.type, 'strategic');
    assert.equal(s.total, 7.5);
    assert.equal(s.opportunityId, 'mem-2');
  });

  it('gets an opportunity score by id', async () => {
    memFindUniqueImpl = async () => makeScoreRow();
    const s = await OpportunityService.getOpportunityScore('mem-s1');
    assert.ok(s);
    assert.equal(s!.name, 'Impact-Effort Score');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeScoreRow({ type: 'opportunity' });
    const s = await OpportunityService.getOpportunityScore('mem-s1');
    assert.equal(s, null);
  });

  it('returns null when opportunity score not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await OpportunityService.getOpportunityScore('nope');
    assert.equal(s, null);
  });

  it('lists opportunity scores by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'opportunity_score') return [makeScoreRow()];
      return [];
    };
    const list = await OpportunityService.listOpportunityScores('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an opportunity score', async () => {
    memFindUniqueImpl = async () => makeScoreRow();
    memUpdateImpl = async (args) => makeScoreRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await OpportunityService.updateOpportunityScore('mem-s1', { status: 'reviewed' });
    assert.ok(s);
    assert.equal(s!.status, 'reviewed');
  });

  it('deletes an opportunity score', async () => {
    memDeleteImpl = async () => ({ id: 'mem-s1' });
    const ok = await OpportunityService.deleteOpportunityScore('mem-s1');
    assert.equal(ok, true);
  });

  it('calculateScore sets status to calculated', async () => {
    memFindUniqueImpl = async () => makeScoreRow();
    memUpdateImpl = async (args) => makeScoreRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await OpportunityService.calculateScore('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'calculated');
  });

  it('reviewScore sets status to reviewed', async () => {
    memFindUniqueImpl = async () => makeScoreRow();
    memUpdateImpl = async (args) => makeScoreRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await OpportunityService.reviewScore('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'reviewed');
  });

  it('adjustScore sets status to adjusted', async () => {
    memFindUniqueImpl = async () => makeScoreRow();
    memUpdateImpl = async (args) => makeScoreRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await OpportunityService.adjustScore('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'adjusted');
  });

  it('archiveScore sets status to archived', async () => {
    memFindUniqueImpl = async () => makeScoreRow();
    memUpdateImpl = async (args) => makeScoreRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await OpportunityService.archiveScore('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Opportunity Actions
// ─────────────────────────────────────────────────────────────────────────────

describe('OpportunityService — Opportunity Actions', () => {
  beforeEach(() => resetMock());

  it('creates an opportunity action with defaults', async () => {
    memCreateImpl = async (args) => makeActionRow({ content: args.data.content as string });
    const a = await OpportunityService.createOpportunityAction('org-1', 'ws-1', {
      name: 'Validate Action', type: 'validate',
    }, 'user-1');
    assert.equal(a.name, 'Validate Action');
    assert.equal(a.status, 'planned');
    assert.equal(a.assignee, '');
  });

  it('creates an opportunity action with full input', async () => {
    memCreateImpl = async (args) => makeActionRow({ content: args.data.content as string });
    const a = await OpportunityService.createOpportunityAction('org-1', 'ws-1', {
      name: 'Execute Action', type: 'execute', description: 'Execute growth plan',
      status: 'in_progress', opportunityId: 'mem-2', action: 'launch',
      assignee: 'team-lead', dueDate: '2028-03-01', priority: 'critical',
      result: 'in progress', notes: 'High priority action',
    }, 'user-1');
    assert.equal(a.name, 'Execute Action');
    assert.equal(a.type, 'execute');
    assert.equal(a.assignee, 'team-lead');
    assert.equal(a.priority, 'critical');
  });

  it('gets an opportunity action by id', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    const a = await OpportunityService.getOpportunityAction('mem-a1');
    assert.ok(a);
    assert.equal(a!.name, 'Investigate Action');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeActionRow({ type: 'opportunity' });
    const a = await OpportunityService.getOpportunityAction('mem-a1');
    assert.equal(a, null);
  });

  it('returns null when opportunity action not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await OpportunityService.getOpportunityAction('nope');
    assert.equal(a, null);
  });

  it('lists opportunity actions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'opportunity_action') return [makeActionRow()];
      return [];
    };
    const list = await OpportunityService.listOpportunityActions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an opportunity action', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    memUpdateImpl = async (args) => makeActionRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await OpportunityService.updateOpportunityAction('mem-a1', { status: 'in_progress' });
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('deletes an opportunity action', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await OpportunityService.deleteOpportunityAction('mem-a1');
    assert.equal(ok, true);
  });

  it('startOpportunityAction sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    memUpdateImpl = async (args) => makeActionRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await OpportunityService.startOpportunityAction('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('completeOpportunityAction sets status to completed', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    memUpdateImpl = async (args) => makeActionRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await OpportunityService.completeOpportunityAction('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });

  it('cancelOpportunityAction sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    memUpdateImpl = async (args) => makeActionRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await OpportunityService.cancelOpportunityAction('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'cancelled');
  });

  it('failOpportunityAction sets status to failed', async () => {
    memFindUniqueImpl = async () => makeActionRow();
    memUpdateImpl = async (args) => makeActionRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await OpportunityService.failOpportunityAction('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('OpportunityService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getOpportunityDetectionMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'opportunity') return [
        makeRow({ content: JSON.stringify({ name: 'O1', type: 'growth', status: 'detected', description: '', source: '', confidence: 0, impact: 0, effort: 0, score: 0, category: '', detectedBy: '', detectedAt: null, evaluatedAt: null, notes: '' }) }),
        makeRow({ id: 'o2', content: JSON.stringify({ name: 'O2', type: 'growth', status: 'approved', description: '', source: '', confidence: 0, impact: 0, effort: 0, score: 0, category: '', detectedBy: '', detectedAt: null, evaluatedAt: null, notes: '' }) }),
        makeRow({ id: 'o3', content: JSON.stringify({ name: 'O3', type: 'growth', status: 'pursuing', description: '', source: '', confidence: 0, impact: 0, effort: 0, score: 0, category: '', detectedBy: '', detectedAt: null, evaluatedAt: null, notes: '' }) }),
        makeRow({ id: 'o4', content: JSON.stringify({ name: 'O4', type: 'growth', status: 'realized', description: '', source: '', confidence: 0, impact: 0, effort: 0, score: 0, category: '', detectedBy: '', detectedAt: null, evaluatedAt: null, notes: '' }) }),
      ];
      if (t === 'detection_rule') return [
        makeRuleRow({ content: JSON.stringify({ name: 'R1', type: 'threshold', status: 'active', description: '', rule: '', conditions: '', actions: '', schedule: '', lastTriggered: null, triggerCount: 0, notes: '' }) }),
      ];
      return [];
    };
    const m = await OpportunityService.getOpportunityDetectionMetrics('org-1');
    assert.equal(m.detectedOpportunities, 1);
    assert.equal(m.approvedOpportunities, 1);
    assert.equal(m.pursuingOpportunities, 1);
    assert.equal(m.realizedOpportunities, 1);
    assert.equal(m.activeRules, 1);
  });

  it('getOpportunityDetectionStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'opportunity') return [makeRow()];
      if (t === 'detection_rule') return [makeRuleRow()];
      if (t === 'opportunity_score') return [makeScoreRow()];
      if (t === 'opportunity_action') return [makeActionRow()];
      return [];
    };
    const s = await OpportunityService.getOpportunityDetectionStats('org-1');
    assert.equal(s.opportunityCount, 1);
    assert.equal(s.ruleCount, 1);
    assert.equal(s.scoreCount, 1);
    assert.equal(s.actionCount, 1);
    assert.equal(s.byOpportunityType['growth'], 1);
    assert.equal(s.byRuleType['threshold'], 1);
    assert.equal(s.byScoreType['impact_effort'], 1);
    assert.equal(s.byActionType['investigate'], 1);
  });
});
