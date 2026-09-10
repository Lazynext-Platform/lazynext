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
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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
    type: 'inn_idea',
    content: JSON.stringify({ title: 'Test', description: '', category: 'product', submittedBy: '', stage: 'submitted', tags: [], estimatedValue: null, estimatedEffort: null, votes: [], advancedBy: '', advancedAt: null }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['inn_idea', 'product', 'submitted']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
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

const { InnovationService } = await import('@/lib/services/innovation-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('InnovationService', () => {
  beforeEach(() => { resetMock(); });

  // ── Ideas ──

  describe('createIdea', () => {
    it('creates an idea with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'inn_idea', content: args.data.content as string });
      const idea = await InnovationService.createIdea('org-1', 'ws-1', { title: 'New Feature', category: 'product', submittedBy: 'alice' }, 'user-1');
      assert.equal(idea.title, 'New Feature');
      assert.equal(idea.category, 'product');
      assert.equal(idea.stage, 'submitted');
      assert.equal(idea.organizationId, 'org-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'inn_idea', content: args.data.content as string });
      const idea = await InnovationService.createIdea('org-1', 'ws-1', {
        title: 'Process', description: 'd', category: 'process', submittedBy: 'bob', stage: 'under_review', tags: ['x'], estimatedValue: 1000, estimatedEffort: 5, votes: ['u1'],
      }, 'user-1');
      assert.equal(idea.category, 'process');
      assert.equal(idea.stage, 'under_review');
      assert.equal(idea.estimatedValue, 1000);
      assert.equal(idea.votes.length, 1);
    });
  });

  describe('getIdea', () => {
    it('returns an idea when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_idea' });
      const idea = await InnovationService.getIdea('mem-1');
      assert.ok(idea);
      assert.equal(idea!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const idea = await InnovationService.getIdea('nope');
      assert.equal(idea, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_project' });
      const idea = await InnovationService.getIdea('mem-1');
      assert.equal(idea, null);
    });
  });

  describe('listIdeas', () => {
    it('lists ideas', async () => {
      memFindManyImpl = async () => [makeRow({ id: 'i1' }), makeRow({ id: 'i2' })];
      const list = await InnovationService.listIdeas('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by category, stage, submittedBy', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'i1', content: JSON.stringify({ title: 'A', description: '', category: 'product', submittedBy: 'alice', stage: 'submitted', tags: [], estimatedValue: null, estimatedEffort: null, votes: [], advancedBy: '', advancedAt: null }) }),
        makeRow({ id: 'i2', content: JSON.stringify({ title: 'B', description: '', category: 'process', submittedBy: 'bob', stage: 'approved', tags: [], estimatedValue: null, estimatedEffort: null, votes: [], advancedBy: '', advancedAt: null }) }),
      ];
      const list = await InnovationService.listIdeas('org-1', { category: 'product', stage: 'submitted', submittedBy: 'alice' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateIdea', () => {
    it('updates idea fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_idea' });
      memUpdateImpl = async (args) => makeRow({ type: 'inn_idea', content: args.data.content as string });
      const idea = await InnovationService.updateIdea('mem-1', { title: 'Updated', stage: 'approved' });
      assert.ok(idea);
      assert.equal(idea!.title, 'Updated');
      assert.equal(idea!.stage, 'approved');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const idea = await InnovationService.updateIdea('nope', { title: 'X' });
      assert.equal(idea, null);
    });
  });

  describe('voteForIdea', () => {
    it('adds a vote', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_idea', content: JSON.stringify({ title: 'T', description: '', category: 'product', submittedBy: '', stage: 'submitted', tags: [], estimatedValue: null, estimatedEffort: null, votes: [], advancedBy: '', advancedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'inn_idea', content: args.data.content as string });
      const idea = await InnovationService.voteForIdea('mem-1', 'voter-1');
      assert.ok(idea);
      assert.equal(idea!.votes.length, 1);
      assert.equal(idea!.votes[0], 'voter-1');
    });

    it('does not add duplicate vote', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_idea', content: JSON.stringify({ title: 'T', description: '', category: 'product', submittedBy: '', stage: 'submitted', tags: [], estimatedValue: null, estimatedEffort: null, votes: ['voter-1'], advancedBy: '', advancedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'inn_idea', content: args.data.content as string });
      const idea = await InnovationService.voteForIdea('mem-1', 'voter-1');
      assert.ok(idea);
      assert.equal(idea!.votes.length, 1);
    });
  });

  describe('advanceIdea', () => {
    it('advances an idea to a new stage', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_idea' });
      memUpdateImpl = async (args) => makeRow({ type: 'inn_idea', content: args.data.content as string });
      const idea = await InnovationService.advanceIdea('mem-1', 'in_development', 'alice');
      assert.ok(idea);
      assert.equal(idea!.stage, 'in_development');
      assert.equal(idea!.advancedBy, 'alice');
      assert.ok(idea!.advancedAt);
    });
  });

  // ── Projects ──

  describe('createProject', () => {
    it('creates a project with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'inn_project', content: args.data.content as string });
      const p = await InnovationService.createProject('org-1', 'ws-1', { name: 'Project X', category: 'technology', status: 'planning' }, 'user-1');
      assert.equal(p.name, 'Project X');
      assert.equal(p.status, 'planning');
      assert.equal(p.milestones.length, 0);
    });

    it('passes through provided fields with milestones', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'inn_project', content: args.data.content as string });
      const p = await InnovationService.createProject('org-1', 'ws-1', {
        name: 'Project Y', category: 'product', status: 'active', budget: 5000, teamLead: 'alice', teamMembers: ['bob'], milestones: [{ name: 'M1', dueDate: '2024-06-01' }], successMetrics: ['metric1'],
      }, 'user-1');
      assert.equal(p.budget, 5000);
      assert.equal(p.teamLead, 'alice');
      assert.equal(p.milestones.length, 1);
      assert.equal(p.milestones[0].status, 'pending');
      assert.equal(p.successMetrics.length, 1);
    });
  });

  describe('getProject', () => {
    it('returns a project when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_project', content: JSON.stringify({ ideaId: null, name: 'P', description: '', category: 'product', status: 'planning', startDate: null, endDate: null, budget: null, teamLead: '', teamMembers: [], milestones: [], successMetrics: [] }) });
      const p = await InnovationService.getProject('mem-1');
      assert.ok(p);
      assert.equal(p!.name, 'P');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_idea' });
      const p = await InnovationService.getProject('mem-1');
      assert.equal(p, null);
    });
  });

  describe('listProjects', () => {
    it('lists projects and filters by category, status, teamLead', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'p1', type: 'inn_project', content: JSON.stringify({ ideaId: null, name: 'A', description: '', category: 'product', status: 'active', startDate: null, endDate: null, budget: null, teamLead: 'alice', teamMembers: [], milestones: [], successMetrics: [] }) }),
        makeRow({ id: 'p2', type: 'inn_project', content: JSON.stringify({ ideaId: null, name: 'B', description: '', category: 'process', status: 'completed', startDate: null, endDate: null, budget: null, teamLead: 'bob', teamMembers: [], milestones: [], successMetrics: [] }) }),
      ];
      const list = await InnovationService.listProjects('org-1', { category: 'product', status: 'active', teamLead: 'alice' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateProject', () => {
    it('updates project fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_project', content: JSON.stringify({ ideaId: null, name: 'Old', description: '', category: 'product', status: 'planning', startDate: null, endDate: null, budget: null, teamLead: '', teamMembers: [], milestones: [], successMetrics: [] }) });
      memUpdateImpl = async (args) => makeRow({ type: 'inn_project', content: args.data.content as string });
      const p = await InnovationService.updateProject('mem-1', { name: 'New', status: 'active', budget: 1000 });
      assert.ok(p);
      assert.equal(p!.name, 'New');
      assert.equal(p!.status, 'active');
      assert.equal(p!.budget, 1000);
    });
  });

  describe('deleteProject', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await InnovationService.deleteProject('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await InnovationService.deleteProject('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Patents ──

  describe('createPatent', () => {
    it('creates a patent with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'inn_patent', content: args.data.content as string });
      const p = await InnovationService.createPatent('org-1', 'ws-1', { title: 'New Patent', status: 'idea' }, 'user-1');
      assert.equal(p.title, 'New Patent');
      assert.equal(p.status, 'idea');
      assert.equal(p.patentType, 'utility');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'inn_patent', content: args.data.content as string });
      const p = await InnovationService.createPatent('org-1', 'ws-1', {
        title: 'Design', applicationNumber: 'APP-1', filingDate: '2024-05-01', status: 'filed', inventor: 'alice', assignee: 'Corp', abstract: 'abs', claims: ['c1'], patentType: 'design', jurisdiction: 'US',
      }, 'user-1');
      assert.equal(p.applicationNumber, 'APP-1');
      assert.equal(p.patentType, 'design');
      assert.equal(p.jurisdiction, 'US');
      assert.equal(p.claims.length, 1);
    });
  });

  describe('getPatent', () => {
    it('returns a patent when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_patent', content: JSON.stringify({ title: 'P', applicationNumber: '', filingDate: null, status: 'idea', inventor: '', assignee: '', abstract: '', claims: [], patentType: 'utility', jurisdiction: '', grantedDate: null, expiryDate: null }) });
      const p = await InnovationService.getPatent('mem-1');
      assert.ok(p);
      assert.equal(p!.title, 'P');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_idea' });
      const p = await InnovationService.getPatent('mem-1');
      assert.equal(p, null);
    });
  });

  describe('listPatents', () => {
    it('lists patents and filters by status, patentType, jurisdiction', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'p1', type: 'inn_patent', content: JSON.stringify({ title: 'A', applicationNumber: '', filingDate: null, status: 'filed', inventor: '', assignee: '', abstract: '', claims: [], patentType: 'utility', jurisdiction: 'US', grantedDate: null, expiryDate: null }) }),
        makeRow({ id: 'p2', type: 'inn_patent', content: JSON.stringify({ title: 'B', applicationNumber: '', filingDate: null, status: 'granted', inventor: '', assignee: '', abstract: '', claims: [], patentType: 'design', jurisdiction: 'EU', grantedDate: null, expiryDate: null }) }),
      ];
      const list = await InnovationService.listPatents('org-1', { status: 'filed', patentType: 'utility', jurisdiction: 'US' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updatePatent', () => {
    it('updates patent fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_patent', content: JSON.stringify({ title: 'Old', applicationNumber: '', filingDate: null, status: 'idea', inventor: '', assignee: '', abstract: '', claims: [], patentType: 'utility', jurisdiction: '', grantedDate: null, expiryDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'inn_patent', content: args.data.content as string });
      const p = await InnovationService.updatePatent('mem-1', { title: 'New', status: 'granted' });
      assert.ok(p);
      assert.equal(p!.title, 'New');
      assert.equal(p!.status, 'granted');
    });
  });

  describe('deletePatent', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await InnovationService.deletePatent('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Metrics ──

  describe('createMetric', () => {
    it('creates a metric with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'inn_metric', content: args.data.content as string });
      const m = await InnovationService.createMetric('org-1', 'ws-1', { name: 'Revenue', category: 'financial', value: 100, unit: 'USD', period: 'Q1' }, 'user-1');
      assert.equal(m.name, 'Revenue');
      assert.equal(m.value, 100);
      assert.equal(m.target, null);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'inn_metric', content: args.data.content as string });
      const m = await InnovationService.createMetric('org-1', 'ws-1', { name: 'NPS', category: 'customer', value: 50, unit: 'pts', period: 'Q2', target: 60, previousValue: 45, trend: 'up' }, 'user-1');
      assert.equal(m.target, 60);
      assert.equal(m.previousValue, 45);
      assert.equal(m.trend, 'up');
    });
  });

  describe('getMetric', () => {
    it('returns a metric when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_metric', content: JSON.stringify({ name: 'M', category: '', value: 0, unit: '', period: '', target: null, previousValue: null, trend: '' }) });
      const m = await InnovationService.getMetric('mem-1');
      assert.ok(m);
      assert.equal(m!.name, 'M');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_idea' });
      const m = await InnovationService.getMetric('mem-1');
      assert.equal(m, null);
    });
  });

  describe('listMetrics', () => {
    it('lists metrics and filters by category, period', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'm1', type: 'inn_metric', content: JSON.stringify({ name: 'A', category: 'financial', value: 100, unit: 'USD', period: 'Q1', target: null, previousValue: null, trend: '' }) }),
        makeRow({ id: 'm2', type: 'inn_metric', content: JSON.stringify({ name: 'B', category: 'customer', value: 50, unit: 'pts', period: 'Q2', target: null, previousValue: null, trend: '' }) }),
      ];
      const list = await InnovationService.listMetrics('org-1', { category: 'financial', period: 'Q1' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateMetric', () => {
    it('updates metric fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_metric', content: JSON.stringify({ name: 'Old', category: '', value: 0, unit: '', period: '', target: null, previousValue: null, trend: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'inn_metric', content: args.data.content as string });
      const m = await InnovationService.updateMetric('mem-1', { name: 'New', value: 200 });
      assert.ok(m);
      assert.equal(m!.name, 'New');
      assert.equal(m!.value, 200);
    });
  });

  describe('deleteMetric', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await InnovationService.deleteMetric('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Challenges ──

  describe('createChallenge', () => {
    it('creates a challenge with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'inn_challenge', content: args.data.content as string });
      const c = await InnovationService.createChallenge('org-1', 'ws-1', { title: 'Hackathon', category: 'technology' }, 'user-1');
      assert.equal(c.title, 'Hackathon');
      assert.equal(c.status, 'open');
      assert.equal(c.participants.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'inn_challenge', content: args.data.content as string });
      const c = await InnovationService.createChallenge('org-1', 'ws-1', {
        title: 'Contest', description: 'd', category: 'product', prize: '$1000', deadline: '2024-12-01', status: 'open', participants: ['a'], submissions: ['s1'], criteria: ['c1'],
      }, 'user-1');
      assert.equal(c.prize, '$1000');
      assert.equal(c.participants.length, 1);
      assert.equal(c.criteria.length, 1);
    });
  });

  describe('getChallenge', () => {
    it('returns a challenge when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_challenge', content: JSON.stringify({ title: 'C', description: '', category: 'product', prize: '', deadline: null, status: 'open', participants: [], submissions: [], winnerId: null, criteria: [], selectedBy: '', selectedAt: null }) });
      const c = await InnovationService.getChallenge('mem-1');
      assert.ok(c);
      assert.equal(c!.title, 'C');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_idea' });
      const c = await InnovationService.getChallenge('mem-1');
      assert.equal(c, null);
    });
  });

  describe('listChallenges', () => {
    it('lists challenges and filters by category, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'inn_challenge', content: JSON.stringify({ title: 'A', description: '', category: 'technology', prize: '', deadline: null, status: 'open', participants: [], submissions: [], winnerId: null, criteria: [], selectedBy: '', selectedAt: null }) }),
        makeRow({ id: 'c2', type: 'inn_challenge', content: JSON.stringify({ title: 'B', description: '', category: 'product', prize: '', deadline: null, status: 'closed', participants: [], submissions: [], winnerId: null, criteria: [], selectedBy: '', selectedAt: null }) }),
      ];
      const list = await InnovationService.listChallenges('org-1', { category: 'technology', status: 'open' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateChallenge', () => {
    it('updates challenge fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_challenge', content: JSON.stringify({ title: 'Old', description: '', category: 'product', prize: '', deadline: null, status: 'open', participants: [], submissions: [], winnerId: null, criteria: [], selectedBy: '', selectedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'inn_challenge', content: args.data.content as string });
      const c = await InnovationService.updateChallenge('mem-1', { title: 'New', status: 'judging' });
      assert.ok(c);
      assert.equal(c!.title, 'New');
      assert.equal(c!.status, 'judging');
    });
  });

  describe('selectWinner', () => {
    it('selects a winner and closes the challenge', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'inn_challenge', content: JSON.stringify({ title: 'C', description: '', category: 'product', prize: '', deadline: null, status: 'open', participants: [], submissions: [], winnerId: null, criteria: [], selectedBy: '', selectedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'inn_challenge', content: args.data.content as string });
      const c = await InnovationService.selectWinner('mem-1', 'winner-1', 'judge-1');
      assert.ok(c);
      assert.equal(c!.winnerId, 'winner-1');
      assert.equal(c!.selectedBy, 'judge-1');
      assert.equal(c!.status, 'closed');
      assert.ok(c!.selectedAt);
    });
  });

  // ── Innovation Metrics & Stats ──

  describe('getInnovationMetrics', () => {
    it('computes metrics across ideas, projects, patents', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'inn_idea') return [
          makeRow({ id: 'i1', type: 'inn_idea', content: JSON.stringify({ title: 'A', description: '', category: 'product', submittedBy: '', stage: 'submitted', tags: [], estimatedValue: 1000, estimatedEffort: 10, votes: [], advancedBy: '', advancedAt: null }) }),
          makeRow({ id: 'i2', type: 'inn_idea', content: JSON.stringify({ title: 'B', description: '', category: 'product', submittedBy: '', stage: 'launched', tags: [], estimatedValue: 500, estimatedEffort: 5, votes: [], advancedBy: 'alice', advancedAt: '2024-06-01' }) }),
        ];
        if (where.type === 'inn_project') return [
          makeRow({ id: 'p1', type: 'inn_project', content: JSON.stringify({ ideaId: null, name: 'P', description: '', category: 'product', status: 'active', startDate: null, endDate: null, budget: null, teamLead: '', teamMembers: [], milestones: [], successMetrics: [] }) }),
        ];
        if (where.type === 'inn_patent') return [
          makeRow({ id: 'pt1', type: 'inn_patent', content: JSON.stringify({ title: 'PT', applicationNumber: '', filingDate: null, status: 'granted', inventor: '', assignee: '', abstract: '', claims: [], patentType: 'utility', jurisdiction: '', grantedDate: null, expiryDate: null }) }),
        ];
        return [];
      };
      const m = await InnovationService.getInnovationMetrics('org-1');
      assert.equal(m.totalIdeas, 2);
      assert.equal(m.activeProjects, 1);
      assert.equal(m.totalPatents, 1);
      assert.equal(m.launchedIdeas, 1);
      assert.equal(m.totalEstimatedValue, 1500);
      assert.equal(m.patentsByStatus['granted'], 1);
    });

    it('returns zero metrics when no data', async () => {
      memFindManyImpl = async () => [];
      const m = await InnovationService.getInnovationMetrics('org-1');
      assert.equal(m.totalIdeas, 0);
      assert.equal(m.innovationROI, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates stats correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'inn_idea') return [makeRow({ type: 'inn_idea', content: JSON.stringify({ title: 'A', description: '', category: 'product', submittedBy: '', stage: 'submitted', tags: [], estimatedValue: null, estimatedEffort: null, votes: [], advancedBy: '', advancedAt: null }) })];
        if (where.type === 'inn_project') return [makeRow({ type: 'inn_project', content: JSON.stringify({ ideaId: null, name: 'P', description: '', category: 'product', status: 'active', startDate: null, endDate: null, budget: null, teamLead: '', teamMembers: [], milestones: [], successMetrics: [] }) })];
        if (where.type === 'inn_patent') return [makeRow({ type: 'inn_patent', content: JSON.stringify({ title: 'PT', applicationNumber: '', filingDate: null, status: 'filed', inventor: '', assignee: '', abstract: '', claims: [], patentType: 'utility', jurisdiction: '', grantedDate: null, expiryDate: null }) })];
        if (where.type === 'inn_metric') return [makeRow({ type: 'inn_metric', content: JSON.stringify({ name: 'M', category: '', value: 0, unit: '', period: '', target: null, previousValue: null, trend: '' }) })];
        if (where.type === 'inn_challenge') return [makeRow({ type: 'inn_challenge', content: JSON.stringify({ title: 'C', description: '', category: 'product', prize: '', deadline: null, status: 'open', participants: [], submissions: [], winnerId: null, criteria: [], selectedBy: '', selectedAt: null }) })];
        return [];
      };
      const stats = await InnovationService.getStats('org-1');
      assert.equal(stats.ideaCount, 1);
      assert.equal(stats.projectCount, 1);
      assert.equal(stats.patentCount, 1);
      assert.equal(stats.metricCount, 1);
      assert.equal(stats.challengeCount, 1);
      assert.equal(stats.openChallengeCount, 1);
      assert.equal(stats.activeProjectCount, 1);
      assert.equal(stats.byIdeaStage['submitted'], 1);
      assert.equal(stats.byPatentStatus['filed'], 1);
    });
  });
});
