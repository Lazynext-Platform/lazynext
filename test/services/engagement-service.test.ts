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
    type: 'engagement_survey',
    content: JSON.stringify({
      title: 'Annual Engagement Survey',
      surveyType: 'annual',
      description: 'Yearly engagement survey',
      startDate: '2028-01-01',
      endDate: '2028-02-01',
      status: 'draft',
      anonymous: true,
      targetAudience: 'All staff',
      expectedResponses: 100,
      publishedBy: '',
      publishedAt: null,
      closedBy: '',
      closedAt: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['engagement_survey', 'annual', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2028-01-01'),
    updatedAt: new Date('2028-01-01'),
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

const { EngagementService } = await import('@/lib/services/engagement-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('EngagementService — Surveys', () => {
  beforeEach(() => resetMock());

  it('creates a survey with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await EngagementService.createSurvey('org-1', 'ws-1', {
      title: 'Pulse Check', surveyType: 'pulse',
    }, 'user-1');
    assert.equal(s.title, 'Pulse Check');
    assert.equal(s.surveyType, 'pulse');
    assert.equal(s.status, 'draft');
    assert.equal(s.anonymous, true);
    assert.equal(s.expectedResponses, 0);
  });

  it('creates a survey with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await EngagementService.createSurvey('org-1', 'ws-1', {
      title: 'Onboarding', surveyType: 'onboarding', description: 'New hire survey',
      startDate: '2028-01-01', endDate: '2028-03-01', status: 'active',
      anonymous: false, targetAudience: 'New hires', expectedResponses: 50, notes: 'Confidential',
    }, 'user-1');
    assert.equal(s.title, 'Onboarding');
    assert.equal(s.description, 'New hire survey');
    assert.equal(s.status, 'active');
    assert.equal(s.anonymous, false);
    assert.equal(s.targetAudience, 'New hires');
    assert.equal(s.expectedResponses, 50);
    assert.equal(s.notes, 'Confidential');
  });

  it('gets a survey by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const s = await EngagementService.getSurvey('mem-1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-1');
    assert.equal(s!.title, 'Annual Engagement Survey');
  });

  it('returns null for non-survey type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'something_else' });
    const s = await EngagementService.getSurvey('mem-1');
    assert.equal(s, null);
  });

  it('returns null when survey not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await EngagementService.getSurvey('nope');
    assert.equal(s, null);
  });

  it('lists surveys by organization', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow({ id: 'mem-2', content: JSON.stringify({ title: 'Second', surveyType: 'pulse', description: '', startDate: null, endDate: null, status: 'active', anonymous: true, targetAudience: '', expectedResponses: 0, publishedBy: '', publishedAt: null, closedBy: '', closedAt: null, notes: '' }) })];
    const list = await EngagementService.listSurveys('org-1');
    assert.equal(list.length, 2);
    assert.equal(list[0].title, 'Annual Engagement Survey');
  });

  it('filters surveys by type', async () => {
    memFindManyImpl = async (args) => {
      const rows = [
        makeRow({ content: JSON.stringify({ title: 'A', surveyType: 'annual', description: '', startDate: null, endDate: null, status: 'draft', anonymous: true, targetAudience: '', expectedResponses: 0, publishedBy: '', publishedAt: null, closedBy: '', closedAt: null, notes: '' }) }),
        makeRow({ id: 'm2', content: JSON.stringify({ title: 'B', surveyType: 'pulse', description: '', startDate: null, endDate: null, status: 'draft', anonymous: true, targetAudience: '', expectedResponses: 0, publishedBy: '', publishedAt: null, closedBy: '', closedAt: null, notes: '' }) }),
      ];
      const where = args.where as Record<string, unknown>;
      const conditions = (where.AND as Array<{ content: { contains: string } }> | undefined) ?? [];
      return rows.filter((r) => conditions.every((cond) => (r.content as string).includes(cond.content.contains)));
    };
    const list = await EngagementService.listSurveys('org-1', { surveyType: 'pulse' });
    assert.equal(list.length, 1);
    assert.equal(list[0].surveyType, 'pulse');
  });

  it('updates a survey', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string, updatedAt: new Date('2028-02-01') });
    const s = await EngagementService.updateSurvey('mem-1', { title: 'Updated Title' });
    assert.ok(s);
    assert.equal(s!.title, 'Updated Title');
  });

  it('deletes a survey', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await EngagementService.deleteSurvey('mem-1');
    assert.equal(ok, true);
  });

  it('publishes a survey', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await EngagementService.publishSurvey('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'published');
    assert.equal(s!.publishedBy, 'user-1');
    assert.ok(s!.publishedAt);
  });

  it('closes a survey', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await EngagementService.closeSurvey('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'closed');
    assert.equal(s!.closedBy, 'user-1');
    assert.ok(s!.closedAt);
  });
});

describe('EngagementService — Questions', () => {
  beforeEach(() => resetMock());

  it('creates a question with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'survey_question', content: args.data.content as string });
    const q = await EngagementService.createQuestion('org-1', 'ws-1', {
      surveyId: 'sur-1', questionText: 'How engaged do you feel?', questionType: 'rating',
    }, 'user-1');
    assert.equal(q.surveyId, 'sur-1');
    assert.equal(q.questionText, 'How engaged do you feel?');
    assert.equal(q.questionType, 'rating');
    assert.equal(q.required, true);
    assert.equal(q.order, 0);
  });

  it('creates a question with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'survey_question', content: args.data.content as string });
    const q = await EngagementService.createQuestion('org-1', 'ws-1', {
      surveyId: 'sur-1', questionText: 'Pick one', questionType: 'multiple_choice',
      options: ['A', 'B', 'C'], required: false, order: 5, notes: 'Choose wisely',
    }, 'user-1');
    assert.equal(q.questionType, 'multiple_choice');
    assert.deepEqual(q.options, ['A', 'B', 'C']);
    assert.equal(q.required, false);
    assert.equal(q.order, 5);
    assert.equal(q.notes, 'Choose wisely');
  });

  it('gets a question by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'survey_question', content: JSON.stringify({
      surveyId: 's1', questionText: 'Q?', questionType: 'open_ended', options: [], required: true, order: 1, notes: '',
    }) });
    const q = await EngagementService.getQuestion('mem-1');
    assert.ok(q);
    assert.equal(q!.questionText, 'Q?');
    assert.equal(q!.questionType, 'open_ended');
  });

  it('returns null for non-question type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'engagement_survey' });
    const q = await EngagementService.getQuestion('mem-1');
    assert.equal(q, null);
  });

  it('lists questions', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'survey_question', content: JSON.stringify({
      surveyId: 's1', questionText: 'Q1', questionType: 'rating', options: [], required: true, order: 0, notes: '',
    }) })];
    const list = await EngagementService.listQuestions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a question', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'survey_question', content: JSON.stringify({
      surveyId: 's1', questionText: 'Q1', questionType: 'rating', options: [], required: true, order: 0, notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'survey_question', content: args.data.content as string });
    const q = await EngagementService.updateQuestion('mem-1', { questionText: 'Updated Q' });
    assert.ok(q);
    assert.equal(q!.questionText, 'Updated Q');
  });

  it('deletes a question', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await EngagementService.deleteQuestion('mem-1');
    assert.equal(ok, true);
  });
});

describe('EngagementService — Responses', () => {
  beforeEach(() => resetMock());

  it('creates a response with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'survey_response', content: args.data.content as string });
    const r = await EngagementService.createResponse('org-1', 'ws-1', {
      surveyId: 'sur-1', respondentId: 'resp-1',
    }, 'user-1');
    assert.equal(r.surveyId, 'sur-1');
    assert.equal(r.respondentId, 'resp-1');
    assert.equal(r.status, 'submitted');
    assert.equal(r.ratingValue, 0);
    assert.ok(r.submittedAt);
  });

  it('creates a response with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'survey_response', content: args.data.content as string });
    const r = await EngagementService.createResponse('org-1', 'ws-1', {
      surveyId: 'sur-1', questionId: 'q-1', respondentId: 'resp-1',
      responseValue: 'Great', ratingValue: 5, comments: 'Loved it', status: 'submitted',
    }, 'user-1');
    assert.equal(r.questionId, 'q-1');
    assert.equal(r.responseValue, 'Great');
    assert.equal(r.ratingValue, 5);
    assert.equal(r.comments, 'Loved it');
  });

  it('gets a response by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'survey_response', content: JSON.stringify({
      surveyId: 's1', questionId: null, respondentId: 'r1', responseValue: 'Yes', ratingValue: 4, comments: '', status: 'submitted', submittedAt: '2028-01-01',
    }) });
    const r = await EngagementService.getResponse('mem-1');
    assert.ok(r);
    assert.equal(r!.respondentId, 'r1');
    assert.equal(r!.ratingValue, 4);
  });

  it('returns null for non-response type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'engagement_survey' });
    const r = await EngagementService.getResponse('mem-1');
    assert.equal(r, null);
  });

  it('lists responses', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'survey_response', content: JSON.stringify({
      surveyId: 's1', questionId: null, respondentId: 'r1', responseValue: '', ratingValue: 0, comments: '', status: 'submitted', submittedAt: '2028-01-01',
    }) })];
    const list = await EngagementService.listResponses('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a response', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'survey_response', content: JSON.stringify({
      surveyId: 's1', questionId: null, respondentId: 'r1', responseValue: '', ratingValue: 0, comments: '', status: 'submitted', submittedAt: '2028-01-01',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'survey_response', content: args.data.content as string });
    const r = await EngagementService.updateResponse('mem-1', { ratingValue: 9 });
    assert.ok(r);
    assert.equal(r!.ratingValue, 9);
  });

  it('deletes a response', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await EngagementService.deleteResponse('mem-1');
    assert.equal(ok, true);
  });
});

describe('EngagementService — Actions', () => {
  beforeEach(() => resetMock());

  it('creates an action with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'engagement_action', content: args.data.content as string });
    const a = await EngagementService.createAction('org-1', 'ws-1', {
      title: 'Improve onboarding',
    }, 'user-1');
    assert.equal(a.title, 'Improve onboarding');
    assert.equal(a.priority, 'medium');
    assert.equal(a.status, 'planned');
    assert.equal(a.progress, 0);
    assert.equal(a.owner, '');
  });

  it('creates an action with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'engagement_action', content: args.data.content as string });
    const a = await EngagementService.createAction('org-1', 'ws-1', {
      title: 'Launch mentorship', surveyId: 'sur-1', description: 'Pair new hires',
      owner: 'jane', priority: 'high', status: 'planned', progress: 10, dueDate: '2028-06-01', notes: 'Q2 priority',
    }, 'user-1');
    assert.equal(a.title, 'Launch mentorship');
    assert.equal(a.surveyId, 'sur-1');
    assert.equal(a.owner, 'jane');
    assert.equal(a.priority, 'high');
    assert.equal(a.progress, 10);
    assert.ok(a.dueDate);
  });

  it('gets an action by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'engagement_action', content: JSON.stringify({
      surveyId: null, title: 'Act', description: '', owner: 'o', priority: 'high', status: 'in_progress', progress: 50, dueDate: null, startedBy: '', startedAt: null, completedBy: '', completedAt: null, notes: '',
    }) });
    const a = await EngagementService.getAction('mem-1');
    assert.ok(a);
    assert.equal(a!.title, 'Act');
    assert.equal(a!.status, 'in_progress');
  });

  it('returns null for non-action type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'engagement_survey' });
    const a = await EngagementService.getAction('mem-1');
    assert.equal(a, null);
  });

  it('lists actions', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'engagement_action', content: JSON.stringify({
      surveyId: null, title: 'A', description: '', owner: '', priority: 'medium', status: 'planned', progress: 0, dueDate: null, startedBy: '', startedAt: null, completedBy: '', completedAt: null, notes: '',
    }) })];
    const list = await EngagementService.listActions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an action', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'engagement_action', content: JSON.stringify({
      surveyId: null, title: 'A', description: '', owner: '', priority: 'medium', status: 'planned', progress: 0, dueDate: null, startedBy: '', startedAt: null, completedBy: '', completedAt: null, notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'engagement_action', content: args.data.content as string });
    const a = await EngagementService.updateAction('mem-1', { progress: 75 });
    assert.ok(a);
    assert.equal(a!.progress, 75);
  });

  it('starts an action', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'engagement_action', content: JSON.stringify({
      surveyId: null, title: 'A', description: '', owner: '', priority: 'medium', status: 'planned', progress: 0, dueDate: null, startedBy: '', startedAt: null, completedBy: '', completedAt: null, notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'engagement_action', content: args.data.content as string });
    const a = await EngagementService.startAction('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
    assert.equal(a!.startedBy, 'user-1');
    assert.ok(a!.startedAt);
  });

  it('completes an action', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'engagement_action', content: JSON.stringify({
      surveyId: null, title: 'A', description: '', owner: '', priority: 'medium', status: 'in_progress', progress: 50, dueDate: null, startedBy: '', startedAt: null, completedBy: '', completedAt: null, notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'engagement_action', content: args.data.content as string });
    const a = await EngagementService.completeAction('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'completed');
    assert.equal(a!.progress, 100);
    assert.equal(a!.completedBy, 'user-1');
    assert.ok(a!.completedAt);
  });
});

describe('EngagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('returns metrics', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      const type = where.type as string;
      if (type === 'engagement_survey') {
        return [makeRow({ content: JSON.stringify({ title: 'S', surveyType: 'annual', description: '', startDate: null, endDate: null, status: 'published', anonymous: true, targetAudience: '', expectedResponses: 100, publishedBy: '', publishedAt: null, closedBy: '', closedAt: null, notes: '' }) })];
      }
      if (type === 'survey_response') {
        return [makeRow({ id: 'r1', type: 'survey_response', content: JSON.stringify({ surveyId: 's1', questionId: null, respondentId: 'r1', responseValue: '', ratingValue: 8, comments: '', status: 'submitted', submittedAt: '2028-01-01' }) })];
      }
      if (type === 'engagement_action') {
        return [makeRow({ id: 'a1', type: 'engagement_action', content: JSON.stringify({ surveyId: null, title: 'A', description: '', owner: '', priority: 'medium', status: 'completed', progress: 100, dueDate: null, startedBy: '', startedAt: null, completedBy: '', completedAt: null, notes: '' }) })];
      }
      return [];
    };
    const m = await EngagementService.getEngagementMetrics('org-1');
    assert.equal(m.totalSurveys, 1);
    assert.equal(m.totalResponses, 1);
    assert.equal(m.responseRate, 1);
    assert.equal(m.averageScore, 8);
    assert.equal(m.actionCompletion, 100);
  });

  it('returns stats with counts', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      const type = where.type as string;
      if (type === 'engagement_survey') {
        return [makeRow({ content: JSON.stringify({ title: 'S', surveyType: 'annual', description: '', startDate: null, endDate: null, status: 'active', anonymous: true, targetAudience: '', expectedResponses: 0, publishedBy: '', publishedAt: null, closedBy: '', closedAt: null, notes: '' }) })];
      }
      if (type === 'survey_question') {
        return [makeRow({ id: 'q1', type: 'survey_question', content: JSON.stringify({ surveyId: 's1', questionText: 'Q', questionType: 'rating', options: [], required: true, order: 0, notes: '' }) })];
      }
      return [];
    };
    const s = await EngagementService.getEngagementStats('org-1');
    assert.equal(s.surveyCount, 1);
    assert.equal(s.activeSurveyCount, 1);
    assert.equal(s.questionCount, 1);
    assert.ok(typeof s.bySurveyType === 'object');
    assert.ok(typeof s.byActionStatus === 'object');
  });
});
