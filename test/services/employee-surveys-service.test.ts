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
    type: 'survey_form',
    content: JSON.stringify({
      title: 'Annual Engagement Survey',
      type: 'engagement',
      description: 'Annual engagement survey',
      status: 'draft',
      anonymous: false,
      startDate: null,
      endDate: null,
      targetCount: 100,
      responseCount: 0,
      questions: [],
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['survey_form', 'engagement', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeResponseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'survey_response',
    content: JSON.stringify({
      surveyId: 'mem-1',
      respondentId: 'emp-1',
      respondentName: 'Alice',
      status: 'pending',
      submittedDate: null,
      answers: [],
      score: 0,
      sentiment: '',
      notes: '',
    }),
    sourceId: 'mem-1',
    tags: JSON.stringify(['survey_response', 'pending']),
    ...overrides,
  });
}

function makeQuestionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-q1',
    type: 'survey_question',
    content: JSON.stringify({
      surveyId: 'mem-1',
      text: 'How satisfied are you?',
      type: 'scale_5',
      required: false,
      options: [],
      scale: 5,
      order: 1,
      notes: '',
    }),
    sourceId: 'mem-1',
    tags: JSON.stringify(['survey_question', 'scale_5']),
    ...overrides,
  });
}

function makeCampaignRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'survey_campaign',
    content: JSON.stringify({
      name: 'Q1 Engagement Campaign',
      type: 'quarterly',
      description: 'Q1 engagement campaign',
      status: 'planned',
      surveyIds: ['mem-1'],
      startDate: null,
      endDate: null,
      targetAudience: 'All staff',
      participationRate: 0,
      notes: '',
    }),
    tags: JSON.stringify(['survey_campaign', 'quarterly', 'planned']),
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

const { EmployeeSurveysService } = await import('@/lib/services/employee-surveys-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Surveys
// ─────────────────────────────────────────────────────────────────────────────

describe('EmployeeSurveysService — Surveys', () => {
  beforeEach(() => resetMock());

  it('creates a survey with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await EmployeeSurveysService.createSurvey('org-1', 'ws-1', {
      title: 'Pulse Survey', type: 'pulse',
    }, 'user-1');
    assert.equal(s.title, 'Pulse Survey');
    assert.equal(s.status, 'draft');
    assert.equal(s.anonymous, false);
    assert.equal(s.targetCount, 0);
    assert.equal(s.questions.length, 0);
  });

  it('creates a survey with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await EmployeeSurveysService.createSurvey('org-1', 'ws-1', {
      title: 'Exit Survey', type: 'exit', description: 'Exit interview survey',
      status: 'published', anonymous: true,
      startDate: '2028-01-01', endDate: '2028-03-31',
      targetCount: 200, responseCount: 50,
      questions: ['q1', 'q2'], notes: 'Confidential',
    }, 'user-1');
    assert.equal(s.title, 'Exit Survey');
    assert.equal(s.type, 'exit');
    assert.equal(s.anonymous, true);
    assert.equal(s.targetCount, 200);
    assert.equal(s.status, 'published');
    assert.equal(s.questions.length, 2);
  });

  it('gets a survey by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const s = await EmployeeSurveysService.getSurvey('mem-1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-1');
    assert.equal(s!.title, 'Annual Engagement Survey');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'survey_response' });
    const s = await EmployeeSurveysService.getSurvey('mem-1');
    assert.equal(s, null);
  });

  it('returns null when survey not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await EmployeeSurveysService.getSurvey('nope');
    assert.equal(s, null);
  });

  it('lists surveys by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'survey_form') return [makeRow()];
      return [];
    };
    const list = await EmployeeSurveysService.listSurveys('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Annual Engagement Survey');
  });

  it('updates a survey', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await EmployeeSurveysService.updateSurvey('mem-1', { status: 'active' });
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('deletes a survey', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await EmployeeSurveysService.deleteSurvey('mem-1');
    assert.equal(ok, true);
  });

  it('publishSurvey sets status to published', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await EmployeeSurveysService.publishSurvey('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'published');
  });

  it('activateSurvey sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await EmployeeSurveysService.activateSurvey('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('pauseSurvey sets status to paused', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await EmployeeSurveysService.pauseSurvey('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'paused');
  });

  it('closeSurvey sets status to closed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await EmployeeSurveysService.closeSurvey('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'closed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Responses
// ─────────────────────────────────────────────────────────────────────────────

describe('EmployeeSurveysService — Responses', () => {
  beforeEach(() => resetMock());

  it('creates a response with defaults', async () => {
    memCreateImpl = async (args) => makeResponseRow({ content: args.data.content as string });
    const r = await EmployeeSurveysService.createResponse('org-1', 'ws-1', {
      surveyId: 'mem-1',
    }, 'user-1');
    assert.equal(r.surveyId, 'mem-1');
    assert.equal(r.status, 'pending');
    assert.equal(r.score, 0);
    assert.equal(r.answers.length, 0);
  });

  it('creates a response with full input', async () => {
    memCreateImpl = async (args) => makeResponseRow({ content: args.data.content as string });
    const r = await EmployeeSurveysService.createResponse('org-1', 'ws-1', {
      surveyId: 'mem-1', respondentId: 'emp-2', respondentName: 'Bob',
      status: 'submitted', submittedDate: '2028-02-01',
      answers: ['a1', 'a2'], score: 4, sentiment: 'positive', notes: 'Great',
    }, 'user-1');
    assert.equal(r.respondentName, 'Bob');
    assert.equal(r.status, 'submitted');
    assert.equal(r.score, 4);
    assert.equal(r.answers.length, 2);
  });

  it('gets a response by id', async () => {
    memFindUniqueImpl = async () => makeResponseRow();
    const r = await EmployeeSurveysService.getResponse('mem-r1');
    assert.ok(r);
    assert.equal(r!.respondentName, 'Alice');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeResponseRow({ type: 'survey_form' });
    const r = await EmployeeSurveysService.getResponse('mem-r1');
    assert.equal(r, null);
  });

  it('lists responses by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'survey_response') return [makeResponseRow()];
      return [];
    };
    const list = await EmployeeSurveysService.listResponses('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a response', async () => {
    memFindUniqueImpl = async () => makeResponseRow();
    memUpdateImpl = async (args) => makeResponseRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EmployeeSurveysService.updateResponse('mem-r1', { score: 5 });
    assert.ok(r);
    assert.equal(r!.score, 5);
  });

  it('deletes a response', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await EmployeeSurveysService.deleteResponse('mem-r1');
    assert.equal(ok, true);
  });

  it('submitResponse sets status to submitted', async () => {
    memFindUniqueImpl = async () => makeResponseRow();
    memUpdateImpl = async (args) => makeResponseRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EmployeeSurveysService.submitResponse('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'submitted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Questions
// ─────────────────────────────────────────────────────────────────────────────

describe('EmployeeSurveysService — Questions', () => {
  beforeEach(() => resetMock());

  it('creates a question with defaults', async () => {
    memCreateImpl = async (args) => makeQuestionRow({ content: args.data.content as string });
    const q = await EmployeeSurveysService.createQuestion('org-1', 'ws-1', {
      surveyId: 'mem-1', text: 'Rate your experience', type: 'scale_10',
    }, 'user-1');
    assert.equal(q.text, 'Rate your experience');
    assert.equal(q.required, false);
    assert.equal(q.scale, 0);
    assert.equal(q.order, 0);
  });

  it('creates a question with full input', async () => {
    memCreateImpl = async (args) => makeQuestionRow({ content: args.data.content as string });
    const q = await EmployeeSurveysService.createQuestion('org-1', 'ws-1', {
      surveyId: 'mem-1', text: 'Select all that apply', type: 'multiple_choice',
      required: true, options: ['A', 'B', 'C'], scale: 0, order: 5, notes: 'Multi-select',
    }, 'user-1');
    assert.equal(q.text, 'Select all that apply');
    assert.equal(q.required, true);
    assert.equal(q.options.length, 3);
    assert.equal(q.order, 5);
  });

  it('gets a question by id', async () => {
    memFindUniqueImpl = async () => makeQuestionRow();
    const q = await EmployeeSurveysService.getQuestion('mem-q1');
    assert.ok(q);
    assert.equal(q!.text, 'How satisfied are you?');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeQuestionRow({ type: 'survey_form' });
    const q = await EmployeeSurveysService.getQuestion('mem-q1');
    assert.equal(q, null);
  });

  it('lists questions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'survey_question') return [makeQuestionRow()];
      return [];
    };
    const list = await EmployeeSurveysService.listQuestions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a question', async () => {
    memFindUniqueImpl = async () => makeQuestionRow();
    memUpdateImpl = async (args) => makeQuestionRow({ id: 'mem-q1', content: args.data.content as string });
    const q = await EmployeeSurveysService.updateQuestion('mem-q1', { required: true });
    assert.ok(q);
    assert.equal(q!.required, true);
  });

  it('deletes a question', async () => {
    memDeleteImpl = async () => ({ id: 'mem-q1' });
    const ok = await EmployeeSurveysService.deleteQuestion('mem-q1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Campaigns
// ─────────────────────────────────────────────────────────────────────────────

describe('EmployeeSurveysService — Campaigns', () => {
  beforeEach(() => resetMock());

  it('creates a campaign with defaults', async () => {
    memCreateImpl = async (args) => makeCampaignRow({ content: args.data.content as string });
    const c = await EmployeeSurveysService.createCampaign('org-1', 'ws-1', {
      name: 'Annual Campaign', type: 'annual',
    }, 'user-1');
    assert.equal(c.name, 'Annual Campaign');
    assert.equal(c.status, 'planned');
    assert.equal(c.participationRate, 0);
    assert.equal(c.surveyIds.length, 0);
  });

  it('creates a campaign with full input', async () => {
    memCreateImpl = async (args) => makeCampaignRow({ content: args.data.content as string });
    const c = await EmployeeSurveysService.createCampaign('org-1', 'ws-1', {
      name: 'Wellness Campaign', type: 'event_driven', description: 'Wellness month',
      status: 'active', surveyIds: ['s1', 's2'],
      startDate: '2028-01-01', endDate: '2028-01-31',
      targetAudience: 'Engineering', participationRate: 75, notes: 'Priority',
    }, 'user-1');
    assert.equal(c.name, 'Wellness Campaign');
    assert.equal(c.type, 'event_driven');
    assert.equal(c.status, 'active');
    assert.equal(c.surveyIds.length, 2);
    assert.equal(c.participationRate, 75);
  });

  it('gets a campaign by id', async () => {
    memFindUniqueImpl = async () => makeCampaignRow();
    const c = await EmployeeSurveysService.getCampaign('mem-c1');
    assert.ok(c);
    assert.equal(c!.name, 'Q1 Engagement Campaign');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCampaignRow({ type: 'survey_form' });
    const c = await EmployeeSurveysService.getCampaign('mem-c1');
    assert.equal(c, null);
  });

  it('lists campaigns by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'survey_campaign') return [makeCampaignRow()];
      return [];
    };
    const list = await EmployeeSurveysService.listCampaigns('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a campaign', async () => {
    memFindUniqueImpl = async () => makeCampaignRow();
    memUpdateImpl = async (args) => makeCampaignRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await EmployeeSurveysService.updateCampaign('mem-c1', { participationRate: 80 });
    assert.ok(c);
    assert.equal(c!.participationRate, 80);
  });

  it('deletes a campaign', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await EmployeeSurveysService.deleteCampaign('mem-c1');
    assert.equal(ok, true);
  });

  it('startCampaign sets status to active', async () => {
    memFindUniqueImpl = async () => makeCampaignRow();
    memUpdateImpl = async (args) => makeCampaignRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await EmployeeSurveysService.startCampaign('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'active');
  });

  it('completeCampaign sets status to completed', async () => {
    memFindUniqueImpl = async () => makeCampaignRow();
    memUpdateImpl = async (args) => makeCampaignRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await EmployeeSurveysService.completeCampaign('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('EmployeeSurveysService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getEmployeeSurveyMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'survey_form') return [
        makeRow({ content: JSON.stringify({ title: 'S1', type: 'engagement', status: 'active', anonymous: false, targetCount: 100, responseCount: 0, questions: [], notes: '' }) }),
        makeRow({ id: 's2', content: JSON.stringify({ title: 'S2', type: 'pulse', status: 'draft', anonymous: false, targetCount: 50, responseCount: 0, questions: [], notes: '' }) }),
      ];
      if (t === 'survey_response') return [
        makeResponseRow({ content: JSON.stringify({ surveyId: 's1', respondentId: '', respondentName: '', status: 'submitted', submittedDate: '2028-02-01', answers: [], score: 4, sentiment: '', notes: '' }) }),
        makeResponseRow({ id: 'r2', content: JSON.stringify({ surveyId: 's1', respondentId: '', respondentName: '', status: 'pending', submittedDate: null, answers: [], score: 0, sentiment: '', notes: '' }) }),
      ];
      if (t === 'survey_campaign') return [
        makeCampaignRow({ content: JSON.stringify({ name: 'C1', type: 'quarterly', status: 'active', surveyIds: [], targetAudience: '', participationRate: 0, notes: '' }) }),
      ];
      return [];
    };
    const m = await EmployeeSurveysService.getEmployeeSurveyMetrics('org-1');
    assert.equal(m.totalSurveys, 2);
    assert.equal(m.activeSurveys, 1);
    assert.equal(m.totalResponses, 2);
    assert.equal(m.submittedResponses, 1);
    assert.equal(m.averageScore, 4);
    assert.equal(m.activeCampaigns, 1);
  });

  it('getEmployeeSurveyStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'survey_form') return [makeRow()];
      if (t === 'survey_response') return [makeResponseRow()];
      if (t === 'survey_question') return [makeQuestionRow()];
      if (t === 'survey_campaign') return [makeCampaignRow()];
      return [];
    };
    const s = await EmployeeSurveysService.getEmployeeSurveyStats('org-1');
    assert.equal(s.surveyCount, 1);
    assert.equal(s.responseCount, 1);
    assert.equal(s.questionCount, 1);
    assert.equal(s.campaignCount, 1);
    assert.equal(s.bySurveyType['engagement'], 1);
    assert.equal(s.bySurveyStatus['draft'], 1);
    assert.equal(s.byResponseStatus['pending'], 1);
    assert.equal(s.byQuestionType['scale_5'], 1);
    assert.equal(s.byCampaignType['quarterly'], 1);
    assert.equal(s.byCampaignStatus['planned'], 1);
  });
});
