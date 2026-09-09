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
    type: 'grant_opportunity',
    content: JSON.stringify({ name: 'Test', funder: 'NSF', program: '', eligibility: '', amount: 50000, deadline: null, status: 'identified', category: '', duration: '', matchScore: 0, description: '' }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['grant_opportunity', 'identified', '']),
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

const { GrantService } = await import('@/lib/services/grant-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GrantService', () => {
  beforeEach(() => { resetMock(); });

  // ── Opportunities ──

  describe('createOpportunity', () => {
    it('creates an opportunity with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'grant_opportunity', content: args.data.content as string });
      const o = await GrantService.createOpportunity('org-1', 'ws-1', { name: 'NSF Grant', funder: 'NSF', amount: 50000 }, 'user-1');
      assert.equal(o.name, 'NSF Grant');
      assert.equal(o.funder, 'NSF');
      assert.equal(o.amount, 50000);
      assert.equal(o.status, 'identified');
      assert.equal(o.program, '');
      assert.equal(o.matchScore, 0);
      assert.equal(o.organizationId, 'org-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'grant_opportunity', content: args.data.content as string });
      const o = await GrantService.createOpportunity('org-1', 'ws-1', {
        name: 'NIH Grant', funder: 'NIH', program: 'R01', eligibility: 'Researchers',
        amount: 100000, deadline: '2024-12-01', status: 'researching', category: 'health',
        duration: '2 years', matchScore: 85, description: 'Health research',
      }, 'user-1');
      assert.equal(o.program, 'R01');
      assert.equal(o.eligibility, 'Researchers');
      assert.equal(o.status, 'researching');
      assert.equal(o.category, 'health');
      assert.equal(o.matchScore, 85);
      assert.equal(o.description, 'Health research');
    });
  });

  describe('getOpportunity', () => {
    it('returns an opportunity when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_opportunity' });
      const o = await GrantService.getOpportunity('mem-1');
      assert.ok(o);
      assert.equal(o!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const o = await GrantService.getOpportunity('nope');
      assert.equal(o, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_application' });
      const o = await GrantService.getOpportunity('mem-1');
      assert.equal(o, null);
    });
  });

  describe('listOpportunities', () => {
    it('lists opportunities', async () => {
      memFindManyImpl = async () => [makeRow({ id: 'o1' }), makeRow({ id: 'o2' })];
      const list = await GrantService.listOpportunities('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by status, funder, category', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'o1', content: JSON.stringify({ name: 'A', funder: 'NSF', program: '', eligibility: '', amount: 50000, deadline: null, status: 'identified', category: 'science', duration: '', matchScore: 0, description: '' }) }),
        makeRow({ id: 'o2', content: JSON.stringify({ name: 'B', funder: 'NIH', program: '', eligibility: '', amount: 50000, deadline: null, status: 'awarded', category: 'health', duration: '', matchScore: 0, description: '' }) }),
      ];
      const list = await GrantService.listOpportunities('org-1', { status: 'identified', funder: 'NSF', category: 'science' });
      assert.equal(list.length, 1);
      assert.equal(list[0].funder, 'NSF');
    });
  });

  describe('updateOpportunity', () => {
    it('updates opportunity fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_opportunity' });
      memUpdateImpl = async (args) => makeRow({ type: 'grant_opportunity', content: args.data.content as string });
      const o = await GrantService.updateOpportunity('mem-1', { name: 'Updated', status: 'awarded', amount: 75000 });
      assert.ok(o);
      assert.equal(o!.name, 'Updated');
      assert.equal(o!.status, 'awarded');
      assert.equal(o!.amount, 75000);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const o = await GrantService.updateOpportunity('nope', { name: 'X' });
      assert.equal(o, null);
    });
  });

  describe('deleteOpportunity', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await GrantService.deleteOpportunity('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await GrantService.deleteOpportunity('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Applications ──

  describe('createApplication', () => {
    it('creates an application with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'grant_application', content: args.data.content as string });
      const a = await GrantService.createApplication('org-1', 'ws-1', { title: 'App 1', funder: 'NSF', amountRequested: 50000 }, 'user-1');
      assert.equal(a.title, 'App 1');
      assert.equal(a.funder, 'NSF');
      assert.equal(a.amountRequested, 50000);
      assert.equal(a.status, 'draft');
      assert.equal(a.narrative, '');
      assert.equal(a.attachments.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'grant_application', content: args.data.content as string });
      const a = await GrantService.createApplication('org-1', 'ws-1', {
        opportunityId: 'opp-1', title: 'App', funder: 'NIH', amountRequested: 100000,
        narrative: 'Story', budget: 'Budget', timeline: 'Timeline', team: 'Team',
        status: 'in_review', deadline: '2024-12-01', attachments: ['file.pdf'],
      }, 'user-1');
      assert.equal(a.opportunityId, 'opp-1');
      assert.equal(a.narrative, 'Story');
      assert.equal(a.budget, 'Budget');
      assert.equal(a.timeline, 'Timeline');
      assert.equal(a.team, 'Team');
      assert.equal(a.status, 'in_review');
      assert.equal(a.attachments.length, 1);
    });
  });

  describe('getApplication', () => {
    it('returns an application when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_application', content: JSON.stringify({ opportunityId: null, title: 'T', funder: 'F', amountRequested: 0, narrative: '', budget: '', timeline: '', team: '', status: 'draft', submittedDate: null, deadline: null, attachments: [], submittedBy: '', withdrawnReason: '', withdrawnBy: '', withdrawnAt: null }) });
      const a = await GrantService.getApplication('mem-1');
      assert.ok(a);
      assert.equal(a!.title, 'T');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_opportunity' });
      const a = await GrantService.getApplication('mem-1');
      assert.equal(a, null);
    });
  });

  describe('listApplications', () => {
    it('lists applications and filters by status, funder', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'a1', type: 'grant_application', content: JSON.stringify({ opportunityId: null, title: 'A', funder: 'NSF', amountRequested: 0, narrative: '', budget: '', timeline: '', team: '', status: 'draft', submittedDate: null, deadline: null, attachments: [], submittedBy: '', withdrawnReason: '', withdrawnBy: '', withdrawnAt: null }) }),
        makeRow({ id: 'a2', type: 'grant_application', content: JSON.stringify({ opportunityId: null, title: 'B', funder: 'NIH', amountRequested: 0, narrative: '', budget: '', timeline: '', team: '', status: 'submitted', submittedDate: null, deadline: null, attachments: [], submittedBy: '', withdrawnReason: '', withdrawnBy: '', withdrawnAt: null }) }),
      ];
      const list = await GrantService.listApplications('org-1', { status: 'draft', funder: 'NSF' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateApplication', () => {
    it('updates application fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_application', content: JSON.stringify({ opportunityId: null, title: 'Old', funder: 'F', amountRequested: 0, narrative: '', budget: '', timeline: '', team: '', status: 'draft', submittedDate: null, deadline: null, attachments: [], submittedBy: '', withdrawnReason: '', withdrawnBy: '', withdrawnAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'grant_application', content: args.data.content as string });
      const a = await GrantService.updateApplication('mem-1', { title: 'New', status: 'under_review' });
      assert.ok(a);
      assert.equal(a!.title, 'New');
      assert.equal(a!.status, 'under_review');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const a = await GrantService.updateApplication('nope', { title: 'X' });
      assert.equal(a, null);
    });
  });

  describe('submitApplication', () => {
    it('submits an application', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_application', content: JSON.stringify({ opportunityId: null, title: 'T', funder: 'F', amountRequested: 0, narrative: '', budget: '', timeline: '', team: '', status: 'draft', submittedDate: null, deadline: null, attachments: [], submittedBy: '', withdrawnReason: '', withdrawnBy: '', withdrawnAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'grant_application', content: args.data.content as string });
      const a = await GrantService.submitApplication('mem-1', 'alice');
      assert.ok(a);
      assert.equal(a!.status, 'submitted');
      assert.equal(a!.submittedBy, 'alice');
      assert.ok(a!.submittedDate);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const a = await GrantService.submitApplication('nope', 'u');
      assert.equal(a, null);
    });
  });

  describe('withdrawApplication', () => {
    it('withdraws an application', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_application', content: JSON.stringify({ opportunityId: null, title: 'T', funder: 'F', amountRequested: 0, narrative: '', budget: '', timeline: '', team: '', status: 'draft', submittedDate: null, deadline: null, attachments: [], submittedBy: '', withdrawnReason: '', withdrawnBy: '', withdrawnAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'grant_application', content: args.data.content as string });
      const a = await GrantService.withdrawApplication('mem-1', 'Not eligible', 'bob');
      assert.ok(a);
      assert.equal(a!.status, 'withdrawn');
      assert.equal(a!.withdrawnReason, 'Not eligible');
      assert.equal(a!.withdrawnBy, 'bob');
      assert.ok(a!.withdrawnAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const a = await GrantService.withdrawApplication('nope', 'r', 'u');
      assert.equal(a, null);
    });
  });

  // ── Awards ──

  describe('createAward', () => {
    it('creates an award with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'grant_award', content: args.data.content as string });
      const a = await GrantService.createAward('org-1', 'ws-1', { title: 'Award 1', funder: 'NSF', amountAwarded: 100000, startDate: '2024-01-01' }, 'user-1');
      assert.equal(a.title, 'Award 1');
      assert.equal(a.funder, 'NSF');
      assert.equal(a.amountAwarded, 100000);
      assert.equal(a.status, 'offered');
      assert.equal(a.conditions, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'grant_award', content: args.data.content as string });
      const a = await GrantService.createAward('org-1', 'ws-1', {
        applicationId: 'app-1', title: 'Award', funder: 'NIH', amountAwarded: 200000,
        startDate: '2024-01-01', endDate: '2025-12-31', conditions: 'Quarterly reports',
        reportingRequirements: 'Annual', status: 'active',
      }, 'user-1');
      assert.equal(a.applicationId, 'app-1');
      assert.equal(a.conditions, 'Quarterly reports');
      assert.equal(a.reportingRequirements, 'Annual');
      assert.equal(a.status, 'active');
    });
  });

  describe('getAward', () => {
    it('returns an award when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_award', content: JSON.stringify({ applicationId: null, title: 'T', funder: 'F', amountAwarded: 0, startDate: '2024-01-01', endDate: null, conditions: '', reportingRequirements: '', status: 'offered', acceptedDate: null, acceptedBy: '', closedBy: '', closedAt: null, closeNotes: '' }) });
      const a = await GrantService.getAward('mem-1');
      assert.ok(a);
      assert.equal(a!.title, 'T');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_opportunity' });
      const a = await GrantService.getAward('mem-1');
      assert.equal(a, null);
    });
  });

  describe('listAwards', () => {
    it('lists awards and filters by status, funder', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'a1', type: 'grant_award', content: JSON.stringify({ applicationId: null, title: 'A', funder: 'NSF', amountAwarded: 0, startDate: '2024-01-01', endDate: null, conditions: '', reportingRequirements: '', status: 'active', acceptedDate: null, acceptedBy: '', closedBy: '', closedAt: null, closeNotes: '' }) }),
        makeRow({ id: 'a2', type: 'grant_award', content: JSON.stringify({ applicationId: null, title: 'B', funder: 'NIH', amountAwarded: 0, startDate: '2024-01-01', endDate: null, conditions: '', reportingRequirements: '', status: 'closed', acceptedDate: null, acceptedBy: '', closedBy: '', closedAt: null, closeNotes: '' }) }),
      ];
      const list = await GrantService.listAwards('org-1', { status: 'active', funder: 'NSF' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateAward', () => {
    it('updates award fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_award', content: JSON.stringify({ applicationId: null, title: 'Old', funder: 'F', amountAwarded: 0, startDate: '2024-01-01', endDate: null, conditions: '', reportingRequirements: '', status: 'offered', acceptedDate: null, acceptedBy: '', closedBy: '', closedAt: null, closeNotes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'grant_award', content: args.data.content as string });
      const a = await GrantService.updateAward('mem-1', { title: 'New', status: 'active' });
      assert.ok(a);
      assert.equal(a!.title, 'New');
      assert.equal(a!.status, 'active');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const a = await GrantService.updateAward('nope', { title: 'X' });
      assert.equal(a, null);
    });
  });

  describe('acceptAward', () => {
    it('accepts an award', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_award', content: JSON.stringify({ applicationId: null, title: 'T', funder: 'F', amountAwarded: 0, startDate: '2024-01-01', endDate: null, conditions: '', reportingRequirements: '', status: 'offered', acceptedDate: null, acceptedBy: '', closedBy: '', closedAt: null, closeNotes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'grant_award', content: args.data.content as string });
      const a = await GrantService.acceptAward('mem-1', 'alice');
      assert.ok(a);
      assert.equal(a!.status, 'accepted');
      assert.equal(a!.acceptedBy, 'alice');
      assert.ok(a!.acceptedDate);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const a = await GrantService.acceptAward('nope', 'u');
      assert.equal(a, null);
    });
  });

  describe('closeAward', () => {
    it('closes an award', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_award', content: JSON.stringify({ applicationId: null, title: 'T', funder: 'F', amountAwarded: 0, startDate: '2024-01-01', endDate: null, conditions: '', reportingRequirements: '', status: 'active', acceptedDate: null, acceptedBy: '', closedBy: '', closedAt: null, closeNotes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'grant_award', content: args.data.content as string });
      const a = await GrantService.closeAward('mem-1', 'bob', 'Project completed');
      assert.ok(a);
      assert.equal(a!.status, 'closed');
      assert.equal(a!.closedBy, 'bob');
      assert.equal(a!.closeNotes, 'Project completed');
      assert.ok(a!.closedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const a = await GrantService.closeAward('nope', 'u');
      assert.equal(a, null);
    });
  });

  // ── Reports ──

  describe('createReport', () => {
    it('creates a report with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'grant_report', content: args.data.content as string });
      const r = await GrantService.createReport('org-1', 'ws-1', { awardId: 'a1', type: 'progress', dueDate: '2024-06-01' }, 'user-1');
      assert.equal(r.awardId, 'a1');
      assert.equal(r.type, 'progress');
      assert.equal(r.status, 'pending');
      assert.equal(r.content, '');
      assert.equal(r.attachments.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'grant_report', content: args.data.content as string });
      const r = await GrantService.createReport('org-1', 'ws-1', {
        awardId: 'a1', type: 'final', dueDate: '2024-06-01', submittedDate: '2024-05-01',
        status: 'in_progress', content: 'Report content', attachments: ['report.pdf'],
        findings: 'Good progress', budgetUtilized: 45000,
      }, 'user-1');
      assert.equal(r.type, 'final');
      assert.equal(r.status, 'in_progress');
      assert.equal(r.content, 'Report content');
      assert.equal(r.findings, 'Good progress');
      assert.equal(r.budgetUtilized, 45000);
      assert.equal(r.attachments.length, 1);
    });
  });

  describe('getReport', () => {
    it('returns a report when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_report', content: JSON.stringify({ awardId: 'a1', type: 'progress', dueDate: '2024-06-01', submittedDate: null, status: 'pending', content: '', attachments: [], findings: '', budgetUtilized: null, submittedBy: '' }) });
      const r = await GrantService.getReport('mem-1');
      assert.ok(r);
      assert.equal(r!.awardId, 'a1');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_opportunity' });
      const r = await GrantService.getReport('mem-1');
      assert.equal(r, null);
    });
  });

  describe('listReports', () => {
    it('lists reports and filters by awardId, status, type', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'r1', type: 'grant_report', content: JSON.stringify({ awardId: 'a1', type: 'progress', dueDate: '2024-06-01', submittedDate: null, status: 'pending', content: '', attachments: [], findings: '', budgetUtilized: null, submittedBy: '' }) }),
        makeRow({ id: 'r2', type: 'grant_report', content: JSON.stringify({ awardId: 'a2', type: 'final', dueDate: '2024-06-02', submittedDate: null, status: 'submitted', content: '', attachments: [], findings: '', budgetUtilized: null, submittedBy: '' }) }),
      ];
      const list = await GrantService.listReports('org-1', { awardId: 'a1', status: 'pending', type: 'progress' });
      assert.equal(list.length, 1);
      assert.equal(list[0].awardId, 'a1');
    });
  });

  describe('updateReport', () => {
    it('updates report fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_report', content: JSON.stringify({ awardId: 'a1', type: 'progress', dueDate: '2024-06-01', submittedDate: null, status: 'pending', content: '', attachments: [], findings: '', budgetUtilized: null, submittedBy: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'grant_report', content: args.data.content as string });
      const r = await GrantService.updateReport('mem-1', { status: 'accepted', findings: 'Excellent' });
      assert.ok(r);
      assert.equal(r!.status, 'accepted');
      assert.equal(r!.findings, 'Excellent');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await GrantService.updateReport('nope', { status: 'accepted' });
      assert.equal(r, null);
    });
  });

  describe('submitReport', () => {
    it('submits a report', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_report', content: JSON.stringify({ awardId: 'a1', type: 'progress', dueDate: '2024-06-01', submittedDate: null, status: 'pending', content: '', attachments: [], findings: '', budgetUtilized: null, submittedBy: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'grant_report', content: args.data.content as string });
      const r = await GrantService.submitReport('mem-1', 'alice', 'Final content');
      assert.ok(r);
      assert.equal(r!.status, 'submitted');
      assert.equal(r!.submittedBy, 'alice');
      assert.equal(r!.content, 'Final content');
      assert.ok(r!.submittedDate);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await GrantService.submitReport('nope', 'u');
      assert.equal(r, null);
    });
  });

  // ── Disbursements ──

  describe('createDisbursement', () => {
    it('creates a disbursement with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'grant_disbursement', content: args.data.content as string });
      const d = await GrantService.createDisbursement('org-1', 'ws-1', { awardId: 'a1', amount: 25000, date: '2024-03-01' }, 'user-1');
      assert.equal(d.awardId, 'a1');
      assert.equal(d.amount, 25000);
      assert.equal(d.status, 'pending');
      assert.equal(d.purpose, '');
      assert.equal(d.approvedBy, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'grant_disbursement', content: args.data.content as string });
      const d = await GrantService.createDisbursement('org-1', 'ws-1', {
        awardId: 'a1', amount: 50000, date: '2024-03-01', purpose: 'Equipment',
        status: 'approved', restrictions: 'Research only', notes: 'First tranche',
      }, 'user-1');
      assert.equal(d.purpose, 'Equipment');
      assert.equal(d.status, 'approved');
      assert.equal(d.restrictions, 'Research only');
      assert.equal(d.notes, 'First tranche');
    });
  });

  describe('getDisbursement', () => {
    it('returns a disbursement when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_disbursement', content: JSON.stringify({ awardId: 'a1', amount: 25000, date: '2024-03-01', purpose: '', status: 'pending', restrictions: '', notes: '', approvedBy: '' }) });
      const d = await GrantService.getDisbursement('mem-1');
      assert.ok(d);
      assert.equal(d!.awardId, 'a1');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_opportunity' });
      const d = await GrantService.getDisbursement('mem-1');
      assert.equal(d, null);
    });
  });

  describe('listDisbursements', () => {
    it('lists disbursements and filters by awardId, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'd1', type: 'grant_disbursement', content: JSON.stringify({ awardId: 'a1', amount: 25000, date: '2024-03-01', purpose: '', status: 'pending', restrictions: '', notes: '', approvedBy: '' }) }),
        makeRow({ id: 'd2', type: 'grant_disbursement', content: JSON.stringify({ awardId: 'a2', amount: 50000, date: '2024-03-02', purpose: '', status: 'approved', restrictions: '', notes: '', approvedBy: '' }) }),
      ];
      const list = await GrantService.listDisbursements('org-1', { awardId: 'a1', status: 'pending' });
      assert.equal(list.length, 1);
      assert.equal(list[0].awardId, 'a1');
    });
  });

  describe('updateDisbursement', () => {
    it('updates disbursement fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_disbursement', content: JSON.stringify({ awardId: 'a1', amount: 25000, date: '2024-03-01', purpose: '', status: 'pending', restrictions: '', notes: '', approvedBy: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'grant_disbursement', content: args.data.content as string });
      const d = await GrantService.updateDisbursement('mem-1', { amount: 30000, status: 'released' });
      assert.ok(d);
      assert.equal(d!.amount, 30000);
      assert.equal(d!.status, 'released');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const d = await GrantService.updateDisbursement('nope', { amount: 100 });
      assert.equal(d, null);
    });
  });

  describe('approveDisbursement', () => {
    it('approves a disbursement', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'grant_disbursement', content: JSON.stringify({ awardId: 'a1', amount: 25000, date: '2024-03-01', purpose: '', status: 'pending', restrictions: '', notes: '', approvedBy: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'grant_disbursement', content: args.data.content as string });
      const d = await GrantService.approveDisbursement('mem-1', 'alice');
      assert.ok(d);
      assert.equal(d!.status, 'approved');
      assert.equal(d!.approvedBy, 'alice');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const d = await GrantService.approveDisbursement('nope', 'u');
      assert.equal(d, null);
    });
  });

  // ── Metrics ──

  describe('getGrantMetrics', () => {
    it('returns metrics with totals and rates', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'grant_application') {
          return [makeRow({ id: 'a1', type: 'grant_application', content: JSON.stringify({ opportunityId: null, title: 'A', funder: 'F', amountRequested: 0, narrative: '', budget: '', timeline: '', team: '', status: 'draft', submittedDate: null, deadline: null, attachments: [], submittedBy: '', withdrawnReason: '', withdrawnBy: '', withdrawnAt: null }) })];
        }
        if (where.type === 'grant_award') {
          return [makeRow({ id: 'aw1', type: 'grant_award', content: JSON.stringify({ applicationId: null, title: 'A', funder: 'F', amountAwarded: 100000, startDate: '2024-01-01', endDate: null, conditions: '', reportingRequirements: '', status: 'active', acceptedDate: null, acceptedBy: '', closedBy: '', closedAt: null, closeNotes: '' }) })];
        }
        if (where.type === 'grant_report') {
          return [];
        }
        if (where.type === 'grant_disbursement') {
          return [];
        }
        if (where.type === 'grant_opportunity') {
          return [];
        }
        return [];
      };
      const metrics = await GrantService.getGrantMetrics('org-1');
      assert.equal(metrics.totalAwarded, 100000);
      assert.equal(metrics.pendingApplications, 1);
      assert.equal(metrics.reportComplianceRate, 100);
      assert.equal(metrics.fundUtilization, 0);
    });
  });

  // ── Stats ──

  describe('getStats', () => {
    it('returns comprehensive stats', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'grant_opportunity') {
          return [makeRow({ id: 'o1', content: JSON.stringify({ name: 'A', funder: 'F', program: '', eligibility: '', amount: 50000, deadline: null, status: 'identified', category: '', duration: '', matchScore: 0, description: '' }) })];
        }
        if (where.type === 'grant_application') {
          return [makeRow({ id: 'a1', type: 'grant_application', content: JSON.stringify({ opportunityId: null, title: 'A', funder: 'F', amountRequested: 0, narrative: '', budget: '', timeline: '', team: '', status: 'draft', submittedDate: null, deadline: null, attachments: [], submittedBy: '', withdrawnReason: '', withdrawnBy: '', withdrawnAt: null }) })];
        }
        if (where.type === 'grant_award') {
          return [makeRow({ id: 'aw1', type: 'grant_award', content: JSON.stringify({ applicationId: null, title: 'A', funder: 'F', amountAwarded: 100000, startDate: '2024-01-01', endDate: null, conditions: '', reportingRequirements: '', status: 'active', acceptedDate: null, acceptedBy: '', closedBy: '', closedAt: null, closeNotes: '' }) })];
        }
        if (where.type === 'grant_report') {
          return [];
        }
        if (where.type === 'grant_disbursement') {
          return [makeRow({ id: 'd1', type: 'grant_disbursement', content: JSON.stringify({ awardId: 'aw1', amount: 25000, date: '2024-03-01', purpose: '', status: 'approved', restrictions: '', notes: '', approvedBy: '' }) })];
        }
        return [];
      };
      const stats = await GrantService.getStats('org-1');
      assert.equal(stats.opportunityCount, 1);
      assert.equal(stats.applicationCount, 1);
      assert.equal(stats.awardCount, 1);
      assert.equal(stats.activeAwardCount, 1);
      assert.equal(stats.disbursementCount, 1);
      assert.equal(stats.pendingApplicationCount, 1);
      assert.equal(stats.byOpportunityStatus.identified, 1);
      assert.equal(stats.byApplicationStatus.draft, 1);
      assert.equal(stats.byAwardStatus.active, 1);
    });
  });
});
