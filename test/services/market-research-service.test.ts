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
    type: 'research_project',
    content: JSON.stringify({
      name: 'Q1 Market Sizing Study',
      type: 'market_sizing',
      status: 'planned',
      description: 'Estimate total addressable market',
      objectives: 'Quantify TAM/SAM/SOM',
      startDate: '2028-01-01',
      endDate: '2028-03-31',
      budget: 25000,
      lead: 'Jane Doe',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['research_project', 'market_sizing', 'planned']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeSegmentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-seg1',
    type: 'market_segment',
    content: JSON.stringify({
      name: 'Enterprise SaaS Buyers',
      type: 'firmographic',
      status: 'active',
      description: 'Companies > 1000 employees',
      size: 5000,
      criteria: 'Revenue > $100M',
      notes: '',
    }),
    tags: JSON.stringify(['market_segment', 'firmographic', 'active']),
    ...overrides,
  });
}

function makeCompetitorRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-comp1',
    type: 'competitor_analysis',
    content: JSON.stringify({
      name: 'Acme Corp',
      type: 'direct',
      status: 'tracking',
      description: 'Direct competitor in enterprise space',
      strengths: 'Strong brand, large sales team',
      weaknesses: 'High pricing, slow innovation',
      marketShare: 18,
      notes: '',
    }),
    tags: JSON.stringify(['competitor_analysis', 'direct', 'tracking']),
    ...overrides,
  });
}

function makeInsightRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-ins1',
    type: 'research_insight',
    content: JSON.stringify({
      projectId: null,
      type: 'opportunity',
      status: 'new',
      priority: 'high',
      title: 'Untapped mid-market segment',
      description: 'Mid-market shows 40% growth',
      notes: '',
    }),
    tags: JSON.stringify(['research_insight', 'opportunity', 'new', 'high']),
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

const { MarketResearchService } = await import('@/lib/services/market-research-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Projects
// ─────────────────────────────────────────────────────────────────────────────

describe('MarketResearchService — Projects', () => {
  beforeEach(() => resetMock());

  it('creates a project with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await MarketResearchService.createProject('org-1', 'ws-1', {
      name: 'TAM Study', type: 'market_sizing',
    }, 'user-1');
    assert.equal(p.name, 'TAM Study');
    assert.equal(p.status, 'planned');
    assert.equal(p.budget, 0);
    assert.equal(p.lead, '');
  });

  it('creates a project with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await MarketResearchService.createProject('org-1', 'ws-1', {
      name: 'Competitor Deep Dive', type: 'competitor_analysis', description: 'Deep dive on top 5',
      objectives: 'Map competitor strategy', startDate: '2028-01-01', endDate: '2028-06-30',
      status: 'in_progress', budget: 50000, lead: 'John', notes: 'High priority',
    }, 'user-1');
    assert.equal(p.name, 'Competitor Deep Dive');
    assert.equal(p.type, 'competitor_analysis');
    assert.equal(p.lead, 'John');
    assert.equal(p.budget, 50000);
    assert.equal(p.status, 'in_progress');
  });

  it('gets a project by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await MarketResearchService.getProject('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'Q1 Market Sizing Study');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'market_segment' });
    const p = await MarketResearchService.getProject('mem-1');
    assert.equal(p, null);
  });

  it('returns null when project not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await MarketResearchService.getProject('nope');
    assert.equal(p, null);
  });

  it('lists projects by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'research_project') return [makeRow()];
      return [];
    };
    const list = await MarketResearchService.listProjects('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Q1 Market Sizing Study');
  });

  it('updates a project', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await MarketResearchService.updateProject('mem-1', { status: 'completed' });
    assert.ok(p);
    assert.equal(p!.status, 'completed');
  });

  it('deletes a project', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await MarketResearchService.deleteProject('mem-1');
    assert.equal(ok, true);
  });

  it('startProject sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await MarketResearchService.startProject('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'in_progress');
  });

  it('completeProject sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await MarketResearchService.completeProject('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'completed');
  });

  it('holdProject sets status to on_hold', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await MarketResearchService.holdProject('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'on_hold');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Segments
// ─────────────────────────────────────────────────────────────────────────────

describe('MarketResearchService — Segments', () => {
  beforeEach(() => resetMock());

  it('creates a segment with defaults', async () => {
    memCreateImpl = async (args) => makeSegmentRow({ content: args.data.content as string });
    const s = await MarketResearchService.createSegment('org-1', 'ws-1', {
      name: 'SMB Buyers', type: 'demographic',
    }, 'user-1');
    assert.equal(s.name, 'SMB Buyers');
    assert.equal(s.status, 'active');
    assert.equal(s.size, 0);
  });

  it('creates a segment with full input', async () => {
    memCreateImpl = async (args) => makeSegmentRow({ content: args.data.content as string });
    const s = await MarketResearchService.createSegment('org-1', 'ws-1', {
      name: 'Enterprise', type: 'firmographic', description: 'Large enterprises',
      size: 1200, criteria: '> 5000 employees', status: 'inactive', notes: 'Review quarterly',
    }, 'user-1');
    assert.equal(s.name, 'Enterprise');
    assert.equal(s.size, 1200);
    assert.equal(s.criteria, '> 5000 employees');
  });

  it('gets a segment by id', async () => {
    memFindUniqueImpl = async () => makeSegmentRow();
    const s = await MarketResearchService.getSegment('mem-seg1');
    assert.ok(s);
    assert.equal(s!.name, 'Enterprise SaaS Buyers');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeSegmentRow({ type: 'research_project' });
    const s = await MarketResearchService.getSegment('mem-seg1');
    assert.equal(s, null);
  });

  it('lists segments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'market_segment') return [makeSegmentRow()];
      return [];
    };
    const list = await MarketResearchService.listSegments('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a segment', async () => {
    memFindUniqueImpl = async () => makeSegmentRow();
    memUpdateImpl = async (args) => makeSegmentRow({ id: 'mem-seg1', content: args.data.content as string });
    const s = await MarketResearchService.updateSegment('mem-seg1', { status: 'inactive' });
    assert.ok(s);
    assert.equal(s!.status, 'inactive');
  });

  it('deletes a segment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-seg1' });
    const ok = await MarketResearchService.deleteSegment('mem-seg1');
    assert.equal(ok, true);
  });

  it('archiveSegment sets status to archived', async () => {
    memFindUniqueImpl = async () => makeSegmentRow();
    memUpdateImpl = async (args) => makeSegmentRow({ id: 'mem-seg1', content: args.data.content as string });
    const s = await MarketResearchService.archiveSegment('mem-seg1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Competitors
// ─────────────────────────────────────────────────────────────────────────────

describe('MarketResearchService — Competitors', () => {
  beforeEach(() => resetMock());

  it('creates a competitor with defaults', async () => {
    memCreateImpl = async (args) => makeCompetitorRow({ content: args.data.content as string });
    const c = await MarketResearchService.createCompetitor('org-1', 'ws-1', {
      name: 'Beta Inc', type: 'indirect',
    }, 'user-1');
    assert.equal(c.name, 'Beta Inc');
    assert.equal(c.status, 'tracking');
    assert.equal(c.marketShare, 0);
  });

  it('creates a competitor with full input', async () => {
    memCreateImpl = async (args) => makeCompetitorRow({ content: args.data.content as string });
    const c = await MarketResearchService.createCompetitor('org-1', 'ws-1', {
      name: 'Gamma Ltd', type: 'direct', description: 'Direct competitor',
      strengths: 'Brand loyalty', weaknesses: 'Limited product line',
      marketShare: 25, status: 'critical', notes: 'Monitor closely',
    }, 'user-1');
    assert.equal(c.name, 'Gamma Ltd');
    assert.equal(c.marketShare, 25);
    assert.equal(c.strengths, 'Brand loyalty');
  });

  it('gets a competitor by id', async () => {
    memFindUniqueImpl = async () => makeCompetitorRow();
    const c = await MarketResearchService.getCompetitor('mem-comp1');
    assert.ok(c);
    assert.equal(c!.name, 'Acme Corp');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCompetitorRow({ type: 'research_project' });
    const c = await MarketResearchService.getCompetitor('mem-comp1');
    assert.equal(c, null);
  });

  it('lists competitors by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'competitor_analysis') return [makeCompetitorRow()];
      return [];
    };
    const list = await MarketResearchService.listCompetitors('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a competitor', async () => {
    memFindUniqueImpl = async () => makeCompetitorRow();
    memUpdateImpl = async (args) => makeCompetitorRow({ id: 'mem-comp1', content: args.data.content as string });
    const c = await MarketResearchService.updateCompetitor('mem-comp1', { marketShare: 22 });
    assert.ok(c);
    assert.equal(c!.marketShare, 22);
  });

  it('deletes a competitor', async () => {
    memDeleteImpl = async () => ({ id: 'mem-comp1' });
    const ok = await MarketResearchService.deleteCompetitor('mem-comp1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Insights
// ─────────────────────────────────────────────────────────────────────────────

describe('MarketResearchService — Insights', () => {
  beforeEach(() => resetMock());

  it('creates an insight with defaults', async () => {
    memCreateImpl = async (args) => makeInsightRow({ content: args.data.content as string });
    const i = await MarketResearchService.createInsight('org-1', 'ws-1', {
      title: 'New trend', type: 'trend', priority: 'medium',
    }, 'user-1');
    assert.equal(i.title, 'New trend');
    assert.equal(i.status, 'new');
    assert.equal(i.priority, 'medium');
  });

  it('creates an insight with full input', async () => {
    memCreateImpl = async (args) => makeInsightRow({ content: args.data.content as string });
    const i = await MarketResearchService.createInsight('org-1', 'ws-1', {
      projectId: 'mem-1', type: 'threat', priority: 'critical',
      title: 'Competitor launching AI feature', description: 'Imminent launch',
      status: 'validated', notes: 'Urgent',
    }, 'user-1');
    assert.equal(i.title, 'Competitor launching AI feature');
    assert.equal(i.priority, 'critical');
    assert.equal(i.projectId, 'mem-1');
  });

  it('gets an insight by id', async () => {
    memFindUniqueImpl = async () => makeInsightRow();
    const i = await MarketResearchService.getInsight('mem-ins1');
    assert.ok(i);
    assert.equal(i!.title, 'Untapped mid-market segment');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeInsightRow({ type: 'research_project' });
    const i = await MarketResearchService.getInsight('mem-ins1');
    assert.equal(i, null);
  });

  it('lists insights by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'research_insight') return [makeInsightRow()];
      return [];
    };
    const list = await MarketResearchService.listInsights('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an insight', async () => {
    memFindUniqueImpl = async () => makeInsightRow();
    memUpdateImpl = async (args) => makeInsightRow({ id: 'mem-ins1', content: args.data.content as string });
    const i = await MarketResearchService.updateInsight('mem-ins1', { priority: 'critical' });
    assert.ok(i);
    assert.equal(i!.priority, 'critical');
  });

  it('deletes an insight', async () => {
    memDeleteImpl = async () => ({ id: 'mem-ins1' });
    const ok = await MarketResearchService.deleteInsight('mem-ins1');
    assert.equal(ok, true);
  });

  it('validateInsight sets status to validated', async () => {
    memFindUniqueImpl = async () => makeInsightRow();
    memUpdateImpl = async (args) => makeInsightRow({ id: 'mem-ins1', content: args.data.content as string });
    const i = await MarketResearchService.validateInsight('mem-ins1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'validated');
  });

  it('actionInsight sets status to actioned', async () => {
    memFindUniqueImpl = async () => makeInsightRow();
    memUpdateImpl = async (args) => makeInsightRow({ id: 'mem-ins1', content: args.data.content as string });
    const i = await MarketResearchService.actionInsight('mem-ins1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'actioned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('MarketResearchService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getMarketResearchMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'research_project') return [
        makeRow({ content: JSON.stringify({ name: 'P1', type: 'market_sizing', status: 'in_progress', description: '', objectives: '', startDate: null, endDate: null, budget: 0, lead: '', notes: '' }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ name: 'P2', type: 'competitor_analysis', status: 'completed', description: '', objectives: '', startDate: null, endDate: null, budget: 0, lead: '', notes: '' }) }),
      ];
      if (t === 'competitor_analysis') return [
        makeCompetitorRow({ content: JSON.stringify({ name: 'C1', type: 'direct', status: 'tracking', description: '', strengths: '', weaknesses: '', marketShare: 0, notes: '' }) }),
        makeCompetitorRow({ id: 'c2', content: JSON.stringify({ name: 'C2', type: 'indirect', status: 'critical', description: '', strengths: '', weaknesses: '', marketShare: 0, notes: '' }) }),
        makeCompetitorRow({ id: 'c3', content: JSON.stringify({ name: 'C3', type: 'potential', status: 'watching', description: '', strengths: '', weaknesses: '', marketShare: 0, notes: '' }) }),
      ];
      if (t === 'market_segment') return [
        makeSegmentRow({ content: JSON.stringify({ name: 'S1', type: 'demographic', status: 'active', description: '', size: 0, criteria: '', notes: '' }) }),
        makeSegmentRow({ id: 's2', content: JSON.stringify({ name: 'S2', type: 'geographic', status: 'inactive', description: '', size: 0, criteria: '', notes: '' }) }),
      ];
      if (t === 'research_insight') return [
        makeInsightRow({ content: JSON.stringify({ projectId: null, type: 'opportunity', status: 'new', priority: 'high', title: 'I1', description: '', notes: '' }) }),
        makeInsightRow({ id: 'i2', content: JSON.stringify({ projectId: null, type: 'threat', status: 'validated', priority: 'medium', title: 'I2', description: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await MarketResearchService.getMarketResearchMetrics('org-1');
    assert.equal(m.activeProjects, 1);
    assert.equal(m.completedProjects, 1);
    assert.equal(m.trackedCompetitors, 2);
    assert.equal(m.activeSegments, 1);
    assert.equal(m.newInsights, 1);
  });

  it('getMarketResearchStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'research_project') return [makeRow()];
      if (t === 'market_segment') return [makeSegmentRow()];
      if (t === 'competitor_analysis') return [makeCompetitorRow()];
      if (t === 'research_insight') return [makeInsightRow()];
      return [];
    };
    const s = await MarketResearchService.getMarketResearchStats('org-1');
    assert.equal(s.projectCount, 1);
    assert.equal(s.segmentCount, 1);
    assert.equal(s.competitorCount, 1);
    assert.equal(s.insightCount, 1);
    assert.equal(s.byProjectType['market_sizing'], 1);
    assert.equal(s.byProjectStatus['planned'], 1);
    assert.equal(s.bySegmentType['firmographic'], 1);
    assert.equal(s.byCompetitorType['direct'], 1);
    assert.equal(s.byInsightType['opportunity'], 1);
    assert.equal(s.byInsightPriority['high'], 1);
  });
});
