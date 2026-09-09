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
    type: 'kt_article',
    content: JSON.stringify({
      title: 'Onboarding Guide',
      type: 'guide',
      description: 'A guide for new hires',
      content: 'Welcome to the team...',
      tags: ['onboarding', 'hr'],
      status: 'draft',
      author: 'Jane Doe',
      department: 'Engineering',
      version: '1.0',
      publishedDate: null,
      reviewedBy: '',
      reviewedDate: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['kt_article', 'guide', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeMentorshipRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-m1',
    type: 'mentorship',
    content: JSON.stringify({
      mentorId: 'u-1',
      mentorName: 'Alice Smith',
      menteeId: 'u-2',
      menteeName: 'Bob Jones',
      description: 'Backend mentorship',
      goals: ['Learn Node.js', 'Master databases'],
      status: 'active',
      startDate: '2028-01-01',
      endDate: null,
      department: 'Engineering',
      skills: ['Node.js', 'PostgreSQL'],
      notes: '',
    }),
    tags: JSON.stringify(['mentorship', 'active']),
    ...overrides,
  });
}

function makeSessionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-s1',
    type: 'kt_session',
    content: JSON.stringify({
      title: 'Code Review Workshop',
      type: 'workshop',
      description: 'Hands-on code review session',
      mentorshipId: 'mem-m1',
      presenter: 'Alice Smith',
      attendees: ['Bob Jones', 'Charlie Doe'],
      scheduledDate: '2028-02-15',
      duration: 90,
      location: 'Conference Room A',
      status: 'scheduled',
      materials: ['slides.pdf', 'example-code.zip'],
      feedback: '',
      notes: '',
    }),
    tags: JSON.stringify(['kt_session', 'workshop', 'scheduled']),
    ...overrides,
  });
}

function makePlanRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'transfer_plan',
    content: JSON.stringify({
      title: 'Senior Dev Knowledge Transfer',
      description: 'Transfer knowledge from departing senior dev',
      owner: 'Alice Smith',
      priority: 'high',
      status: 'draft',
      sourcePerson: 'John Doe',
      targetPerson: 'Bob Jones',
      department: 'Engineering',
      skills: ['Architecture', 'DevOps', 'Security'],
      startDate: '2028-01-01',
      endDate: '2028-06-30',
      milestones: ['Shadow sessions', 'Documentation', 'Solo project'],
      progress: 0,
      notes: 'Critical knowledge transfer',
    }),
    tags: JSON.stringify(['transfer_plan', 'high', 'draft']),
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

const { KnowledgeTransferService } = await import('@/lib/services/knowledge-transfer-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Articles
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeTransferService — Articles', () => {
  beforeEach(() => resetMock());

  it('creates an article with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await KnowledgeTransferService.createArticle('org-1', 'ws-1', {
      title: 'Getting Started', type: 'tutorial',
    }, 'user-1');
    assert.equal(a.title, 'Getting Started');
    assert.equal(a.status, 'draft');
    assert.equal(a.version, '1.0');
    assert.equal(a.tags.length, 0);
  });

  it('creates an article with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await KnowledgeTransferService.createArticle('org-1', 'ws-1', {
      title: 'API Best Practices', type: 'best_practice', description: 'API design guide',
      content: 'Use REST...', tags: ['api', 'design'], status: 'in_review',
      author: 'Jane', department: 'Engineering', version: '2.1',
      publishedDate: '2028-03-01', reviewedBy: 'Bob', reviewedDate: '2028-02-15', notes: 'Review pending',
    }, 'user-1');
    assert.equal(a.title, 'API Best Practices');
    assert.equal(a.type, 'best_practice');
    assert.equal(a.author, 'Jane');
    assert.equal(a.version, '2.1');
    assert.equal(a.status, 'in_review');
    assert.equal(a.tags.length, 2);
  });

  it('gets an article by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const a = await KnowledgeTransferService.getArticle('mem-1');
    assert.ok(a);
    assert.equal(a!.id, 'mem-1');
    assert.equal(a!.title, 'Onboarding Guide');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'mentorship' });
    const a = await KnowledgeTransferService.getArticle('mem-1');
    assert.equal(a, null);
  });

  it('returns null when article not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await KnowledgeTransferService.getArticle('nope');
    assert.equal(a, null);
  });

  it('lists articles by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'kt_article') return [makeRow()];
      return [];
    };
    const list = await KnowledgeTransferService.listArticles('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Onboarding Guide');
  });

  it('updates an article', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await KnowledgeTransferService.updateArticle('mem-1', { status: 'in_review' });
    assert.ok(a);
    assert.equal(a!.status, 'in_review');
  });

  it('deletes an article', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await KnowledgeTransferService.deleteArticle('mem-1');
    assert.equal(ok, true);
  });

  it('publishArticle sets status to published', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await KnowledgeTransferService.publishArticle('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'published');
  });

  it('archiveArticle sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await KnowledgeTransferService.archiveArticle('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Mentorships
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeTransferService — Mentorships', () => {
  beforeEach(() => resetMock());

  it('creates a mentorship with defaults', async () => {
    memCreateImpl = async (args) => makeMentorshipRow({ content: args.data.content as string });
    const m = await KnowledgeTransferService.createMentorship('org-1', 'ws-1', {
      mentorId: 'u-1', mentorName: 'Alice', menteeId: 'u-2', menteeName: 'Bob',
    }, 'user-1');
    assert.equal(m.mentorName, 'Alice');
    assert.equal(m.menteeName, 'Bob');
    assert.equal(m.status, 'active');
    assert.equal(m.goals.length, 0);
  });

  it('creates a mentorship with full input', async () => {
    memCreateImpl = async (args) => makeMentorshipRow({ content: args.data.content as string });
    const m = await KnowledgeTransferService.createMentorship('org-1', 'ws-1', {
      mentorId: 'u-1', mentorName: 'Alice', menteeId: 'u-2', menteeName: 'Bob',
      description: 'Frontend mentorship', goals: ['Learn React'], status: 'on_hold',
      startDate: '2028-01-01', endDate: '2028-06-30', department: 'Frontend',
      skills: ['React', 'TypeScript'], notes: 'On hold due to project',
    }, 'user-1');
    assert.equal(m.mentorName, 'Alice');
    assert.equal(m.status, 'on_hold');
    assert.equal(m.skills.length, 2);
    assert.equal(m.department, 'Frontend');
  });

  it('gets a mentorship by id', async () => {
    memFindUniqueImpl = async () => makeMentorshipRow();
    const m = await KnowledgeTransferService.getMentorship('mem-m1');
    assert.ok(m);
    assert.equal(m!.mentorName, 'Alice Smith');
    assert.equal(m!.menteeName, 'Bob Jones');
  });

  it('lists mentorships by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'mentorship') return [makeMentorshipRow()];
      return [];
    };
    const list = await KnowledgeTransferService.listMentorships('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a mentorship', async () => {
    memFindUniqueImpl = async () => makeMentorshipRow();
    memUpdateImpl = async (args) => makeMentorshipRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await KnowledgeTransferService.updateMentorship('mem-m1', { status: 'on_hold' });
    assert.ok(m);
    assert.equal(m!.status, 'on_hold');
  });

  it('deletes a mentorship', async () => {
    memDeleteImpl = async () => ({ id: 'mem-m1' });
    const ok = await KnowledgeTransferService.deleteMentorship('mem-m1');
    assert.equal(ok, true);
  });

  it('completeMentorship sets status to completed', async () => {
    memFindUniqueImpl = async () => makeMentorshipRow();
    memUpdateImpl = async (args) => makeMentorshipRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await KnowledgeTransferService.completeMentorship('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'completed');
  });

  it('holdMentorship sets status to on_hold', async () => {
    memFindUniqueImpl = async () => makeMentorshipRow();
    memUpdateImpl = async (args) => makeMentorshipRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await KnowledgeTransferService.holdMentorship('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'on_hold');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Sessions
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeTransferService — Sessions', () => {
  beforeEach(() => resetMock());

  it('creates a session with defaults', async () => {
    memCreateImpl = async (args) => makeSessionRow({ content: args.data.content as string });
    const s = await KnowledgeTransferService.createSession('org-1', 'ws-1', {
      title: 'Intro Session', type: 'training',
    }, 'user-1');
    assert.equal(s.title, 'Intro Session');
    assert.equal(s.status, 'scheduled');
    assert.equal(s.duration, 0);
    assert.equal(s.attendees.length, 0);
  });

  it('creates a session with full input', async () => {
    memCreateImpl = async (args) => makeSessionRow({ content: args.data.content as string });
    const s = await KnowledgeTransferService.createSession('org-1', 'ws-1', {
      title: 'Pair Programming', type: 'pairing', description: 'Pair on feature X',
      mentorshipId: 'mem-m1', presenter: 'Alice', attendees: ['Bob', 'Charlie'],
      scheduledDate: '2028-03-01', duration: 120, location: 'Remote',
      status: 'in_progress', materials: ['repo-link'], feedback: 'Great session',
      notes: 'Follow up next week',
    }, 'user-1');
    assert.equal(s.title, 'Pair Programming');
    assert.equal(s.type, 'pairing');
    assert.equal(s.duration, 120);
    assert.equal(s.attendees.length, 2);
  });

  it('gets a session by id', async () => {
    memFindUniqueImpl = async () => makeSessionRow();
    const s = await KnowledgeTransferService.getSession('mem-s1');
    assert.ok(s);
    assert.equal(s!.title, 'Code Review Workshop');
  });

  it('lists sessions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'kt_session') return [makeSessionRow()];
      return [];
    };
    const list = await KnowledgeTransferService.listSessions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a session', async () => {
    memFindUniqueImpl = async () => makeSessionRow();
    memUpdateImpl = async (args) => makeSessionRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await KnowledgeTransferService.updateSession('mem-s1', { status: 'in_progress' });
    assert.ok(s);
    assert.equal(s!.status, 'in_progress');
  });

  it('deletes a session', async () => {
    memDeleteImpl = async () => ({ id: 'mem-s1' });
    const ok = await KnowledgeTransferService.deleteSession('mem-s1');
    assert.equal(ok, true);
  });

  it('startSession sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeSessionRow();
    memUpdateImpl = async (args) => makeSessionRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await KnowledgeTransferService.startSession('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'in_progress');
  });

  it('completeSession sets status to completed', async () => {
    memFindUniqueImpl = async () => makeSessionRow();
    memUpdateImpl = async (args) => makeSessionRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await KnowledgeTransferService.completeSession('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'completed');
  });

  it('postponeSession sets status to postponed', async () => {
    memFindUniqueImpl = async () => makeSessionRow();
    memUpdateImpl = async (args) => makeSessionRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await KnowledgeTransferService.postponeSession('mem-s1', '2028-04-01', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'postponed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Plans
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeTransferService — Plans', () => {
  beforeEach(() => resetMock());

  it('creates a plan with defaults', async () => {
    memCreateImpl = async (args) => makePlanRow({ content: args.data.content as string });
    const p = await KnowledgeTransferService.createPlan('org-1', 'ws-1', {
      title: 'DevOps Knowledge Transfer',
    }, 'user-1');
    assert.equal(p.title, 'DevOps Knowledge Transfer');
    assert.equal(p.status, 'draft');
    assert.equal(p.priority, 'medium');
    assert.equal(p.progress, 0);
  });

  it('creates a plan with full input', async () => {
    memCreateImpl = async (args) => makePlanRow({ content: args.data.content as string });
    const p = await KnowledgeTransferService.createPlan('org-1', 'ws-1', {
      title: 'Critical System Transfer', description: 'Transfer critical system knowledge',
      owner: 'Alice', priority: 'critical', status: 'active',
      sourcePerson: 'John', targetPerson: 'Bob', department: 'DevOps',
      skills: ['Kubernetes', 'Terraform'], startDate: '2028-01-01', endDate: '2028-03-31',
      milestones: ['Shadow', 'Document', 'Lead'], progress: 25, notes: 'High priority',
    }, 'user-1');
    assert.equal(p.title, 'Critical System Transfer');
    assert.equal(p.priority, 'critical');
    assert.equal(p.status, 'active');
    assert.equal(p.progress, 25);
    assert.equal(p.milestones.length, 3);
  });

  it('gets a plan by id', async () => {
    memFindUniqueImpl = async () => makePlanRow();
    const p = await KnowledgeTransferService.getPlan('mem-p1');
    assert.ok(p);
    assert.equal(p!.title, 'Senior Dev Knowledge Transfer');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePlanRow({ type: 'kt_article' });
    const p = await KnowledgeTransferService.getPlan('mem-p1');
    assert.equal(p, null);
  });

  it('lists plans by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'transfer_plan') return [makePlanRow()];
      return [];
    };
    const list = await KnowledgeTransferService.listPlans('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a plan', async () => {
    memFindUniqueImpl = async () => makePlanRow();
    memUpdateImpl = async (args) => makePlanRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await KnowledgeTransferService.updatePlan('mem-p1', { progress: 50 });
    assert.ok(p);
    assert.equal(p!.progress, 50);
  });

  it('deletes a plan', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await KnowledgeTransferService.deletePlan('mem-p1');
    assert.equal(ok, true);
  });

  it('activatePlan sets status to active', async () => {
    memFindUniqueImpl = async () => makePlanRow();
    memUpdateImpl = async (args) => makePlanRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await KnowledgeTransferService.activatePlan('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('completePlan sets status to completed', async () => {
    memFindUniqueImpl = async () => makePlanRow();
    memUpdateImpl = async (args) => makePlanRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await KnowledgeTransferService.completePlan('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'completed');
    assert.equal(p!.progress, 100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeTransferService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getKnowledgeTransferMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'kt_article') return [
        makeRow({ content: JSON.stringify({ title: 'A1', type: 'guide', status: 'published', author: '', department: '', version: '1.0', description: '', content: '', tags: [], publishedDate: null, reviewedBy: '', reviewedDate: null, notes: '' }) }),
        makeRow({ id: 'a2', content: JSON.stringify({ title: 'A2', type: 'tutorial', status: 'draft', author: '', department: '', version: '1.0', description: '', content: '', tags: [], publishedDate: null, reviewedBy: '', reviewedDate: null, notes: '' }) }),
      ];
      if (t === 'mentorship') return [
        makeMentorshipRow({ content: JSON.stringify({ mentorId: 'u1', mentorName: 'A', menteeId: 'u2', menteeName: 'B', status: 'active', description: '', goals: [], startDate: null, endDate: null, department: '', skills: [], notes: '' }) }),
        makeMentorshipRow({ id: 'm2', content: JSON.stringify({ mentorId: 'u3', mentorName: 'C', menteeId: 'u4', menteeName: 'D', status: 'completed', description: '', goals: [], startDate: null, endDate: null, department: '', skills: [], notes: '' }) }),
      ];
      if (t === 'kt_session') return [
        makeSessionRow({ content: JSON.stringify({ title: 'S1', type: 'workshop', status: 'scheduled', description: '', mentorshipId: null, presenter: '', attendees: [], scheduledDate: null, duration: 0, location: '', materials: [], feedback: '', notes: '' }) }),
      ];
      if (t === 'transfer_plan') return [
        makePlanRow({ content: JSON.stringify({ title: 'P1', status: 'active', priority: 'high', description: '', owner: '', sourcePerson: '', targetPerson: '', department: '', skills: [], startDate: null, endDate: null, milestones: [], progress: 0, notes: '' }) }),
        makePlanRow({ id: 'p2', content: JSON.stringify({ title: 'P2', status: 'completed', priority: 'medium', description: '', owner: '', sourcePerson: '', targetPerson: '', department: '', skills: [], startDate: null, endDate: null, milestones: [], progress: 100, notes: '' }) }),
      ];
      return [];
    };
    const m = await KnowledgeTransferService.getKnowledgeTransferMetrics('org-1');
    assert.equal(m.publishedArticles, 1);
    assert.equal(m.activeMentorships, 1);
    assert.equal(m.scheduledSessions, 1);
    assert.equal(m.activePlans, 1);
    assert.equal(m.completionRate, 50);
  });

  it('getKnowledgeTransferStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'kt_article') return [makeRow()];
      if (t === 'mentorship') return [makeMentorshipRow()];
      if (t === 'kt_session') return [makeSessionRow()];
      if (t === 'transfer_plan') return [makePlanRow()];
      return [];
    };
    const s = await KnowledgeTransferService.getKnowledgeTransferStats('org-1');
    assert.equal(s.articleCount, 1);
    assert.equal(s.mentorshipCount, 1);
    assert.equal(s.sessionCount, 1);
    assert.equal(s.planCount, 1);
    assert.equal(s.byArticleType['guide'], 1);
    assert.equal(s.byArticleStatus['draft'], 1);
    assert.equal(s.byMentorshipStatus['active'], 1);
    assert.equal(s.bySessionType['workshop'], 1);
    assert.equal(s.bySessionStatus['scheduled'], 1);
    assert.equal(s.byPlanStatus['draft'], 1);
    assert.equal(s.byPlanPriority['high'], 1);
  });
});
