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
    type: 'journey_map',
    content: JSON.stringify({
      title: 'Enterprise SaaS Journey',
      description: 'Full lifecycle journey',
      persona: 'Decision Maker',
      status: 'draft',
      startDate: '2028-01-01',
      endDate: '2028-12-31',
      owner: 'Jane Doe',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['journey_map', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeStageRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-st1',
    type: 'journey_stage',
    content: JSON.stringify({
      journeyId: 'mem-1',
      name: 'Awareness Stage',
      type: 'awareness',
      description: 'Customer discovers the product',
      order: 0,
      goals: 'Build brand awareness',
      painPoints: 'Too many options',
      opportunities: 'Content marketing',
      status: 'active',
      notes: '',
    }),
    tags: JSON.stringify(['journey_stage', 'awareness', 'active']),
    ...overrides,
  });
}

function makeTouchpointRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-tp1',
    type: 'touchpoint',
    content: JSON.stringify({
      journeyId: 'mem-1',
      stageId: 'mem-st1',
      name: 'Website Homepage',
      type: 'website',
      description: 'Main landing page',
      channel: 'Web',
      status: 'active',
      owner: 'Marketing',
      frequency: 'Daily',
      notes: '',
    }),
    tags: JSON.stringify(['touchpoint', 'website', 'active']),
    ...overrides,
  });
}

function makeScoreRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-sc1',
    type: 'experience_score',
    content: JSON.stringify({
      journeyId: 'mem-1',
      touchpointId: 'mem-tp1',
      stageId: 'mem-st1',
      type: 'csat',
      value: 8,
      maxValue: 10,
      respondentId: 'resp-1',
      respondentName: 'John Smith',
      comment: 'Great experience',
      collectedDate: '2028-02-01',
      status: 'collected',
      notes: '',
    }),
    tags: JSON.stringify(['experience_score', 'csat', 'collected']),
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

const { CustomerJourneyService } = await import('@/lib/services/customer-journey-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Journeys
// ─────────────────────────────────────────────────────────────────────────────

describe('CustomerJourneyService — Journeys', () => {
  beforeEach(() => resetMock());

  it('creates a journey with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const j = await CustomerJourneyService.createJourney('org-1', 'ws-1', {
      title: 'New Journey',
    }, 'user-1');
    assert.equal(j.title, 'New Journey');
    assert.equal(j.status, 'draft');
    assert.equal(j.persona, '');
    assert.equal(j.owner, '');
  });

  it('creates a journey with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const j = await CustomerJourneyService.createJourney('org-1', 'ws-1', {
      title: 'Full Journey', description: 'Complete journey map',
      persona: 'Tech Lead', status: 'active',
      startDate: '2028-01-01', endDate: '2028-06-30',
      owner: 'Alice', notes: 'High priority',
    }, 'user-1');
    assert.equal(j.title, 'Full Journey');
    assert.equal(j.persona, 'Tech Lead');
    assert.equal(j.status, 'active');
    assert.equal(j.owner, 'Alice');
  });

  it('gets a journey by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const j = await CustomerJourneyService.getJourney('mem-1');
    assert.ok(j);
    assert.equal(j!.id, 'mem-1');
    assert.equal(j!.title, 'Enterprise SaaS Journey');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'journey_stage' });
    const j = await CustomerJourneyService.getJourney('mem-1');
    assert.equal(j, null);
  });

  it('returns null when journey not found', async () => {
    memFindUniqueImpl = async () => null;
    const j = await CustomerJourneyService.getJourney('nope');
    assert.equal(j, null);
  });

  it('lists journeys by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'journey_map') return [makeRow()];
      return [];
    };
    const list = await CustomerJourneyService.listJourneys('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Enterprise SaaS Journey');
  });

  it('updates a journey', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const j = await CustomerJourneyService.updateJourney('mem-1', { status: 'active' });
    assert.ok(j);
    assert.equal(j!.status, 'active');
  });

  it('deletes a journey', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await CustomerJourneyService.deleteJourney('mem-1');
    assert.equal(ok, true);
  });

  it('activateJourney sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const j = await CustomerJourneyService.activateJourney('mem-1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'active');
  });

  it('archiveJourney sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const j = await CustomerJourneyService.archiveJourney('mem-1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Stages
// ─────────────────────────────────────────────────────────────────────────────

describe('CustomerJourneyService — Stages', () => {
  beforeEach(() => resetMock());

  it('creates a stage with defaults', async () => {
    memCreateImpl = async (args) => makeStageRow({ content: args.data.content as string });
    const s = await CustomerJourneyService.createStage('org-1', 'ws-1', {
      journeyId: 'mem-1', name: 'Discovery', type: 'awareness',
    }, 'user-1');
    assert.equal(s.name, 'Discovery');
    assert.equal(s.order, 0);
    assert.equal(s.status, 'active');
  });

  it('creates a stage with full input', async () => {
    memCreateImpl = async (args) => makeStageRow({ content: args.data.content as string });
    const s = await CustomerJourneyService.createStage('org-1', 'ws-1', {
      journeyId: 'mem-1', name: 'Purchase', type: 'purchase',
      description: 'Buying decision', order: 3,
      goals: 'Convert', painPoints: 'Price', opportunities: 'Discounts',
      status: 'active', notes: 'Critical stage',
    }, 'user-1');
    assert.equal(s.name, 'Purchase');
    assert.equal(s.type, 'purchase');
    assert.equal(s.order, 3);
    assert.equal(s.goals, 'Convert');
  });

  it('gets a stage by id', async () => {
    memFindUniqueImpl = async () => makeStageRow();
    const s = await CustomerJourneyService.getStage('mem-st1');
    assert.ok(s);
    assert.equal(s!.name, 'Awareness Stage');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeStageRow({ type: 'journey_map' });
    const s = await CustomerJourneyService.getStage('mem-st1');
    assert.equal(s, null);
  });

  it('lists stages by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'journey_stage') return [makeStageRow()];
      return [];
    };
    const list = await CustomerJourneyService.listStages('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a stage', async () => {
    memFindUniqueImpl = async () => makeStageRow();
    memUpdateImpl = async (args) => makeStageRow({ id: 'mem-st1', content: args.data.content as string });
    const s = await CustomerJourneyService.updateStage('mem-st1', { order: 5 });
    assert.ok(s);
    assert.equal(s!.order, 5);
  });

  it('deletes a stage', async () => {
    memDeleteImpl = async () => ({ id: 'mem-st1' });
    const ok = await CustomerJourneyService.deleteStage('mem-st1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Touchpoints
// ─────────────────────────────────────────────────────────────────────────────

describe('CustomerJourneyService — Touchpoints', () => {
  beforeEach(() => resetMock());

  it('creates a touchpoint with defaults', async () => {
    memCreateImpl = async (args) => makeTouchpointRow({ content: args.data.content as string });
    const t = await CustomerJourneyService.createTouchpoint('org-1', 'ws-1', {
      journeyId: 'mem-1', name: 'Email Campaign', type: 'email',
    }, 'user-1');
    assert.equal(t.name, 'Email Campaign');
    assert.equal(t.status, 'active');
    assert.equal(t.channel, '');
  });

  it('creates a touchpoint with full input', async () => {
    memCreateImpl = async (args) => makeTouchpointRow({ content: args.data.content as string });
    const t = await CustomerJourneyService.createTouchpoint('org-1', 'ws-1', {
      journeyId: 'mem-1', stageId: 'mem-st1', name: 'Support Chat', type: 'chat',
      description: 'Live chat support', channel: 'Web', status: 'planned',
      owner: 'Support Team', frequency: 'On-demand', notes: '24/7',
    }, 'user-1');
    assert.equal(t.name, 'Support Chat');
    assert.equal(t.type, 'chat');
    assert.equal(t.channel, 'Web');
    assert.equal(t.status, 'planned');
  });

  it('gets a touchpoint by id', async () => {
    memFindUniqueImpl = async () => makeTouchpointRow();
    const t = await CustomerJourneyService.getTouchpoint('mem-tp1');
    assert.ok(t);
    assert.equal(t!.name, 'Website Homepage');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTouchpointRow({ type: 'journey_map' });
    const t = await CustomerJourneyService.getTouchpoint('mem-tp1');
    assert.equal(t, null);
  });

  it('lists touchpoints by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'touchpoint') return [makeTouchpointRow()];
      return [];
    };
    const list = await CustomerJourneyService.listTouchpoints('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a touchpoint', async () => {
    memFindUniqueImpl = async () => makeTouchpointRow();
    memUpdateImpl = async (args) => makeTouchpointRow({ id: 'mem-tp1', content: args.data.content as string });
    const t = await CustomerJourneyService.updateTouchpoint('mem-tp1', { status: 'inactive' });
    assert.ok(t);
    assert.equal(t!.status, 'inactive');
  });

  it('deletes a touchpoint', async () => {
    memDeleteImpl = async () => ({ id: 'mem-tp1' });
    const ok = await CustomerJourneyService.deleteTouchpoint('mem-tp1');
    assert.equal(ok, true);
  });

  it('deactivateTouchpoint sets status to inactive', async () => {
    memFindUniqueImpl = async () => makeTouchpointRow();
    memUpdateImpl = async (args) => makeTouchpointRow({ id: 'mem-tp1', content: args.data.content as string });
    const t = await CustomerJourneyService.deactivateTouchpoint('mem-tp1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'inactive');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Scores
// ─────────────────────────────────────────────────────────────────────────────

describe('CustomerJourneyService — Scores', () => {
  beforeEach(() => resetMock());

  it('creates a score with defaults', async () => {
    memCreateImpl = async (args) => makeScoreRow({ content: args.data.content as string });
    const s = await CustomerJourneyService.createScore('org-1', 'ws-1', {
      type: 'nps', value: 7,
    }, 'user-1');
    assert.equal(s.type, 'nps');
    assert.equal(s.value, 7);
    assert.equal(s.maxValue, 10);
    assert.equal(s.status, 'collected');
  });

  it('creates a score with full input', async () => {
    memCreateImpl = async (args) => makeScoreRow({ content: args.data.content as string });
    const s = await CustomerJourneyService.createScore('org-1', 'ws-1', {
      type: 'csat', value: 9, maxValue: 10,
      journeyId: 'mem-1', touchpointId: 'mem-tp1', stageId: 'mem-st1',
      respondentId: 'resp-2', respondentName: 'Jane',
      comment: 'Excellent', collectedDate: '2028-03-01',
      status: 'pending', notes: 'Follow up',
    }, 'user-1');
    assert.equal(s.type, 'csat');
    assert.equal(s.value, 9);
    assert.equal(s.maxValue, 10);
    assert.equal(s.respondentName, 'Jane');
    assert.equal(s.status, 'pending');
  });

  it('gets a score by id', async () => {
    memFindUniqueImpl = async () => makeScoreRow();
    const s = await CustomerJourneyService.getScore('mem-sc1');
    assert.ok(s);
    assert.equal(s!.type, 'csat');
    assert.equal(s!.value, 8);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeScoreRow({ type: 'journey_map' });
    const s = await CustomerJourneyService.getScore('mem-sc1');
    assert.equal(s, null);
  });

  it('lists scores by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'experience_score') return [makeScoreRow()];
      return [];
    };
    const list = await CustomerJourneyService.listScores('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a score', async () => {
    memFindUniqueImpl = async () => makeScoreRow();
    memUpdateImpl = async (args) => makeScoreRow({ id: 'mem-sc1', content: args.data.content as string });
    const s = await CustomerJourneyService.updateScore('mem-sc1', { value: 10 });
    assert.ok(s);
    assert.equal(s!.value, 10);
  });

  it('deletes a score', async () => {
    memDeleteImpl = async () => ({ id: 'mem-sc1' });
    const ok = await CustomerJourneyService.deleteScore('mem-sc1');
    assert.equal(ok, true);
  });

  it('analyzeScore sets status to analyzed', async () => {
    memFindUniqueImpl = async () => makeScoreRow();
    memUpdateImpl = async (args) => makeScoreRow({ id: 'mem-sc1', content: args.data.content as string });
    const s = await CustomerJourneyService.analyzeScore('mem-sc1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'analyzed');
  });

  it('actionScore sets status to actioned', async () => {
    memFindUniqueImpl = async () => makeScoreRow();
    memUpdateImpl = async (args) => makeScoreRow({ id: 'mem-sc1', content: args.data.content as string });
    const s = await CustomerJourneyService.actionScore('mem-sc1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'actioned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('CustomerJourneyService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getCustomerJourneyMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'journey_map') return [
        makeRow({ content: JSON.stringify({ title: 'J1', persona: '', status: 'active', owner: '', notes: '', description: '', startDate: null, endDate: null }) }),
        makeRow({ id: 'j2', content: JSON.stringify({ title: 'J2', persona: '', status: 'draft', owner: '', notes: '', description: '', startDate: null, endDate: null }) }),
      ];
      if (t === 'touchpoint') return [
        makeTouchpointRow({ content: JSON.stringify({ journeyId: 'mem-1', stageId: null, name: 'TP1', type: 'website', description: '', channel: '', status: 'active', owner: '', frequency: '', notes: '' }) }),
        makeTouchpointRow({ id: 'tp2', content: JSON.stringify({ journeyId: 'mem-1', stageId: null, name: 'TP2', type: 'email', description: '', channel: '', status: 'active', owner: '', frequency: '', notes: '' }) }),
      ];
      if (t === 'experience_score') return [
        makeScoreRow({ content: JSON.stringify({ journeyId: 'mem-1', touchpointId: null, stageId: null, type: 'csat', value: 8, maxValue: 10, respondentId: '', respondentName: '', comment: '', collectedDate: null, status: 'collected', notes: '' }) }),
        makeScoreRow({ id: 'sc2', content: JSON.stringify({ journeyId: 'mem-1', touchpointId: null, stageId: null, type: 'nps', value: 5, maxValue: 10, respondentId: '', respondentName: '', comment: '', collectedDate: null, status: 'collected', notes: '' }) }),
      ];
      if (t === 'journey_stage') return [
        makeStageRow({ content: JSON.stringify({ journeyId: 'mem-1', name: 'S1', type: 'awareness', description: '', order: 0, goals: '', painPoints: '', opportunities: '', status: 'active', notes: '' }) }),
        makeStageRow({ id: 'st2', content: JSON.stringify({ journeyId: 'mem-1', name: 'S2', type: 'purchase', description: '', order: 1, goals: '', painPoints: '', opportunities: '', status: 'active', notes: '' }) }),
      ];
      return [];
    };
    const m = await CustomerJourneyService.getCustomerJourneyMetrics('org-1');
    assert.equal(m.activeJourneys, 1);
    assert.equal(m.totalTouchpoints, 2);
    assert.equal(m.averageScore, 65);
    assert.equal(m.stagesCoverage, 2);
  });

  it('getCustomerJourneyStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'journey_map') return [makeRow()];
      if (t === 'journey_stage') return [makeStageRow()];
      if (t === 'touchpoint') return [makeTouchpointRow()];
      if (t === 'experience_score') return [makeScoreRow()];
      return [];
    };
    const s = await CustomerJourneyService.getCustomerJourneyStats('org-1');
    assert.equal(s.journeyCount, 1);
    assert.equal(s.stageCount, 1);
    assert.equal(s.touchpointCount, 1);
    assert.equal(s.scoreCount, 1);
    assert.equal(s.byJourneyStatus['draft'], 1);
    assert.equal(s.byStageType['awareness'], 1);
    assert.equal(s.byTouchpointType['website'], 1);
    assert.equal(s.byTouchpointStatus['active'], 1);
    assert.equal(s.byScoreType['csat'], 1);
    assert.equal(s.byScoreStatus['collected'], 1);
  });
});
