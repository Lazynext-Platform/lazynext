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
    type: 'stakeholder',
    content: JSON.stringify({ name: 'Test', type: 'other', organization: '', role: '', email: '', phone: '', influence: 'low', interest: 'low', category: '', notes: '', engagementStrategy: 'monitor' }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['stakeholder', 'other', 'low', 'low', 'monitor']),
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

const { StakeholderService } = await import('@/lib/services/stakeholder-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('StakeholderService', () => {
  beforeEach(() => { resetMock(); });

  // ── Stakeholders ──

  describe('createStakeholder', () => {
    it('creates a stakeholder with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder', content: args.data.content as string });
      const s = await StakeholderService.createStakeholder('org-1', 'ws-1', { name: 'Acme Inc', type: 'investor', influence: 'high', interest: 'high' }, 'user-1');
      assert.equal(s.name, 'Acme Inc');
      assert.equal(s.type, 'investor');
      assert.equal(s.organization, '');
      assert.equal(s.role, '');
      assert.equal(s.email, '');
      assert.equal(s.phone, '');
      assert.equal(s.category, '');
      assert.equal(s.notes, '');
      assert.equal(s.organizationId, 'org-1');
    });

    it('auto-calculates engagement strategy: manage_closely for high influence + high interest', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder', content: args.data.content as string });
      const s = await StakeholderService.createStakeholder('org-1', 'ws-1', { name: 'A', type: 'investor', influence: 'very_high', interest: 'high' }, 'user-1');
      assert.equal(s.engagementStrategy, 'manage_closely');
    });

    it('auto-calculates engagement strategy: keep_satisfied for high influence + low interest', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder', content: args.data.content as string });
      const s = await StakeholderService.createStakeholder('org-1', 'ws-1', { name: 'A', type: 'executive', influence: 'high', interest: 'low' }, 'user-1');
      assert.equal(s.engagementStrategy, 'keep_satisfied');
    });

    it('auto-calculates engagement strategy: keep_informed for low influence + high interest', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder', content: args.data.content as string });
      const s = await StakeholderService.createStakeholder('org-1', 'ws-1', { name: 'A', type: 'employee', influence: 'low', interest: 'high' }, 'user-1');
      assert.equal(s.engagementStrategy, 'keep_informed');
    });

    it('auto-calculates engagement strategy: monitor for low influence + low interest', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder', content: args.data.content as string });
      const s = await StakeholderService.createStakeholder('org-1', 'ws-1', { name: 'A', type: 'other', influence: 'low', interest: 'low' }, 'user-1');
      assert.equal(s.engagementStrategy, 'monitor');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder', content: args.data.content as string });
      const s = await StakeholderService.createStakeholder('org-1', 'ws-1', {
        name: 'John', type: 'board_member', organization: 'Acme', role: 'Director',
        email: 'john@acme.com', phone: '555-0100', influence: 'high', interest: 'high',
        category: 'governance', notes: 'Key decision maker',
      }, 'user-1');
      assert.equal(s.organization, 'Acme');
      assert.equal(s.role, 'Director');
      assert.equal(s.email, 'john@acme.com');
      assert.equal(s.phone, '555-0100');
      assert.equal(s.category, 'governance');
      assert.equal(s.notes, 'Key decision maker');
    });
  });

  describe('getStakeholder', () => {
    it('returns a stakeholder when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder' });
      const s = await StakeholderService.getStakeholder('mem-1');
      assert.ok(s);
      assert.equal(s!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const s = await StakeholderService.getStakeholder('nope');
      assert.equal(s, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder_engagement' });
      const s = await StakeholderService.getStakeholder('mem-1');
      assert.equal(s, null);
    });
  });

  describe('listStakeholders', () => {
    it('lists stakeholders', async () => {
      memFindManyImpl = async () => [makeRow({ id: 's1' }), makeRow({ id: 's2' })];
      const list = await StakeholderService.listStakeholders('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by type, influence, interest, category', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 's1', content: JSON.stringify({ name: 'A', type: 'investor', organization: '', role: '', email: '', phone: '', influence: 'high', interest: 'high', category: 'gov', notes: '', engagementStrategy: 'manage_closely' }) }),
        makeRow({ id: 's2', content: JSON.stringify({ name: 'B', type: 'employee', organization: '', role: '', email: '', phone: '', influence: 'low', interest: 'low', category: 'internal', notes: '', engagementStrategy: 'monitor' }) }),
      ];
      const list = await StakeholderService.listStakeholders('org-1', { type: 'investor', influence: 'high', interest: 'high', category: 'gov' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'investor');
    });
  });

  describe('updateStakeholder', () => {
    it('updates stakeholder fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder' });
      memUpdateImpl = async (args) => makeRow({ type: 'stakeholder', content: args.data.content as string });
      const s = await StakeholderService.updateStakeholder('mem-1', { name: 'Updated', notes: 'new notes' });
      assert.ok(s);
      assert.equal(s!.name, 'Updated');
      assert.equal(s!.notes, 'new notes');
    });

    it('recalculates strategy when influence changes', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder', content: JSON.stringify({ name: 'A', type: 'other', organization: '', role: '', email: '', phone: '', influence: 'low', interest: 'low', category: '', notes: '', engagementStrategy: 'monitor' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'stakeholder', content: args.data.content as string });
      const s = await StakeholderService.updateStakeholder('mem-1', { influence: 'high', interest: 'high' });
      assert.ok(s);
      assert.equal(s!.engagementStrategy, 'manage_closely');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const s = await StakeholderService.updateStakeholder('nope', { name: 'X' });
      assert.equal(s, null);
    });
  });

  describe('deleteStakeholder', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await StakeholderService.deleteStakeholder('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await StakeholderService.deleteStakeholder('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Engagements ──

  describe('createEngagement', () => {
    it('creates an engagement with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder_engagement', content: args.data.content as string });
      const e = await StakeholderService.createEngagement('org-1', 'ws-1', { stakeholderId: 's1', type: 'meeting', date: '2024-05-01', topic: 'QBR' }, 'user-1');
      assert.equal(e.stakeholderId, 's1');
      assert.equal(e.type, 'meeting');
      assert.equal(e.topic, 'QBR');
      assert.equal(e.status, 'planned');
      assert.equal(e.outcome, '');
      assert.equal(e.actionItems.length, 0);
      assert.equal(e.attendees.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder_engagement', content: args.data.content as string });
      const e = await StakeholderService.createEngagement('org-1', 'ws-1', {
        stakeholderId: 's1', type: 'call', date: '2024-05-01', topic: 'Update',
        outcome: 'Good', actionItems: ['Follow up'], nextSteps: 'Schedule next', attendees: ['Alice'], status: 'completed',
      }, 'user-1');
      assert.equal(e.outcome, 'Good');
      assert.equal(e.actionItems.length, 1);
      assert.equal(e.nextSteps, 'Schedule next');
      assert.equal(e.attendees.length, 1);
      assert.equal(e.status, 'completed');
    });
  });

  describe('getEngagement', () => {
    it('returns an engagement when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder_engagement', content: JSON.stringify({ stakeholderId: 's1', type: 'meeting', date: '2024-05-01', topic: 'T', outcome: '', actionItems: [], nextSteps: '', attendees: [], status: 'planned', completedBy: '', completedAt: null }) });
      const e = await StakeholderService.getEngagement('mem-1');
      assert.ok(e);
      assert.equal(e!.stakeholderId, 's1');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder' });
      const e = await StakeholderService.getEngagement('mem-1');
      assert.equal(e, null);
    });
  });

  describe('listEngagements', () => {
    it('lists engagements and filters by stakeholderId, type, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'e1', type: 'stakeholder_engagement', content: JSON.stringify({ stakeholderId: 's1', type: 'meeting', date: '2024-05-01', topic: 'A', outcome: '', actionItems: [], nextSteps: '', attendees: [], status: 'planned', completedBy: '', completedAt: null }) }),
        makeRow({ id: 'e2', type: 'stakeholder_engagement', content: JSON.stringify({ stakeholderId: 's2', type: 'call', date: '2024-05-02', topic: 'B', outcome: '', actionItems: [], nextSteps: '', attendees: [], status: 'completed', completedBy: '', completedAt: null }) }),
      ];
      const list = await StakeholderService.listEngagements('org-1', { stakeholderId: 's1', type: 'meeting', status: 'planned' });
      assert.equal(list.length, 1);
      assert.equal(list[0].stakeholderId, 's1');
    });
  });

  describe('updateEngagement', () => {
    it('updates engagement fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder_engagement', content: JSON.stringify({ stakeholderId: 's1', type: 'meeting', date: '2024-05-01', topic: 'Old', outcome: '', actionItems: [], nextSteps: '', attendees: [], status: 'planned', completedBy: '', completedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'stakeholder_engagement', content: args.data.content as string });
      const e = await StakeholderService.updateEngagement('mem-1', { topic: 'New', status: 'cancelled' });
      assert.ok(e);
      assert.equal(e!.topic, 'New');
      assert.equal(e!.status, 'cancelled');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const e = await StakeholderService.updateEngagement('nope', { topic: 'X' });
      assert.equal(e, null);
    });
  });

  describe('completeEngagement', () => {
    it('completes an engagement', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder_engagement', content: JSON.stringify({ stakeholderId: 's1', type: 'meeting', date: '2024-05-01', topic: 'T', outcome: '', actionItems: [], nextSteps: '', attendees: [], status: 'planned', completedBy: '', completedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'stakeholder_engagement', content: args.data.content as string });
      const e = await StakeholderService.completeEngagement('mem-1', 'Great results', 'alice');
      assert.ok(e);
      assert.equal(e!.status, 'completed');
      assert.equal(e!.outcome, 'Great results');
      assert.equal(e!.completedBy, 'alice');
      assert.ok(e!.completedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const e = await StakeholderService.completeEngagement('nope', 'r', 'u');
      assert.equal(e, null);
    });
  });

  // ── Sentiments ──

  describe('createSentiment', () => {
    it('creates a sentiment with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder_sentiment', content: args.data.content as string });
      const s = await StakeholderService.createSentiment('org-1', 'ws-1', { stakeholderId: 's1', sentiment: 'positive', date: '2024-05-01' }, 'user-1');
      assert.equal(s.stakeholderId, 's1');
      assert.equal(s.sentiment, 'positive');
      assert.equal(s.score, null);
      assert.equal(s.reason, '');
      assert.equal(s.trend, 'stable');
      assert.equal(s.recordedBy, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder_sentiment', content: args.data.content as string });
      const s = await StakeholderService.createSentiment('org-1', 'ws-1', {
        stakeholderId: 's1', sentiment: 'very_positive', score: 0.9, date: '2024-05-01',
        reason: 'Great partnership', trend: 'improving', recordedBy: 'bob',
      }, 'user-1');
      assert.equal(s.score, 0.9);
      assert.equal(s.reason, 'Great partnership');
      assert.equal(s.trend, 'improving');
      assert.equal(s.recordedBy, 'bob');
    });
  });

  describe('getSentiment', () => {
    it('returns a sentiment when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder_sentiment', content: JSON.stringify({ stakeholderId: 's1', sentiment: 'positive', score: null, date: '2024-05-01', reason: '', trend: 'stable', recordedBy: '' }) });
      const s = await StakeholderService.getSentiment('mem-1');
      assert.ok(s);
      assert.equal(s!.sentiment, 'positive');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder' });
      const s = await StakeholderService.getSentiment('mem-1');
      assert.equal(s, null);
    });
  });

  describe('listSentiments', () => {
    it('lists sentiments and filters by stakeholderId, sentiment', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 's1', type: 'stakeholder_sentiment', content: JSON.stringify({ stakeholderId: 'st1', sentiment: 'positive', score: null, date: '2024-05-01', reason: '', trend: 'stable', recordedBy: '' }) }),
        makeRow({ id: 's2', type: 'stakeholder_sentiment', content: JSON.stringify({ stakeholderId: 'st2', sentiment: 'negative', score: null, date: '2024-05-02', reason: '', trend: 'stable', recordedBy: '' }) }),
      ];
      const list = await StakeholderService.listSentiments('org-1', { stakeholderId: 'st1', sentiment: 'positive' });
      assert.equal(list.length, 1);
      assert.equal(list[0].stakeholderId, 'st1');
    });
  });

  describe('updateSentiment', () => {
    it('updates sentiment fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder_sentiment', content: JSON.stringify({ stakeholderId: 's1', sentiment: 'neutral', score: null, date: '2024-05-01', reason: '', trend: 'stable', recordedBy: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'stakeholder_sentiment', content: args.data.content as string });
      const s = await StakeholderService.updateSentiment('mem-1', { sentiment: 'negative', reason: 'Issues arose', trend: 'declining' });
      assert.ok(s);
      assert.equal(s!.sentiment, 'negative');
      assert.equal(s!.reason, 'Issues arose');
      assert.equal(s!.trend, 'declining');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const s = await StakeholderService.updateSentiment('nope', { sentiment: 'positive' });
      assert.equal(s, null);
    });
  });

  describe('deleteSentiment', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await StakeholderService.deleteSentiment('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await StakeholderService.deleteSentiment('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Communications ──

  describe('createCommunication', () => {
    it('creates a communication with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder_communication', content: args.data.content as string });
      const c = await StakeholderService.createCommunication('org-1', 'ws-1', { stakeholderId: 's1', channel: 'email', subject: 'Update', content: 'Hello', date: '2024-05-01' }, 'user-1');
      assert.equal(c.stakeholderId, 's1');
      assert.equal(c.channel, 'email');
      assert.equal(c.subject, 'Update');
      assert.equal(c.content, 'Hello');
      assert.equal(c.status, 'draft');
      assert.equal(c.sentBy, '');
      assert.equal(c.response, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'stakeholder_communication', content: args.data.content as string });
      const c = await StakeholderService.createCommunication('org-1', 'ws-1', {
        stakeholderId: 's1', channel: 'newsletter', subject: 'Monthly', content: 'News', date: '2024-05-01',
        sentBy: 'alice', status: 'sent', response: 'Thanks', responseDate: '2024-05-02',
      }, 'user-1');
      assert.equal(c.sentBy, 'alice');
      assert.equal(c.status, 'sent');
      assert.equal(c.response, 'Thanks');
    });
  });

  describe('getCommunication', () => {
    it('returns a communication when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder_communication', content: JSON.stringify({ stakeholderId: 's1', channel: 'email', subject: 'S', content: 'C', date: '2024-05-01', sentBy: '', status: 'draft', response: '', responseDate: null }) });
      const c = await StakeholderService.getCommunication('mem-1');
      assert.ok(c);
      assert.equal(c!.subject, 'S');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder' });
      const c = await StakeholderService.getCommunication('mem-1');
      assert.equal(c, null);
    });
  });

  describe('listCommunications', () => {
    it('lists communications and filters by stakeholderId, channel, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'stakeholder_communication', content: JSON.stringify({ stakeholderId: 'st1', channel: 'email', subject: 'A', content: '', date: '2024-05-01', sentBy: '', status: 'draft', response: '', responseDate: null }) }),
        makeRow({ id: 'c2', type: 'stakeholder_communication', content: JSON.stringify({ stakeholderId: 'st2', channel: 'letter', subject: 'B', content: '', date: '2024-05-02', sentBy: '', status: 'sent', response: '', responseDate: null }) }),
      ];
      const list = await StakeholderService.listCommunications('org-1', { stakeholderId: 'st1', channel: 'email', status: 'draft' });
      assert.equal(list.length, 1);
      assert.equal(list[0].stakeholderId, 'st1');
    });
  });

  describe('updateCommunication', () => {
    it('updates communication fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder_communication', content: JSON.stringify({ stakeholderId: 's1', channel: 'email', subject: 'Old', content: 'C', date: '2024-05-01', sentBy: '', status: 'draft', response: '', responseDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'stakeholder_communication', content: args.data.content as string });
      const c = await StakeholderService.updateCommunication('mem-1', { subject: 'New', status: 'archived' });
      assert.ok(c);
      assert.equal(c!.subject, 'New');
      assert.equal(c!.status, 'archived');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const c = await StakeholderService.updateCommunication('nope', { subject: 'X' });
      assert.equal(c, null);
    });
  });

  describe('sendCommunication', () => {
    it('sends a communication', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder_communication', content: JSON.stringify({ stakeholderId: 's1', channel: 'email', subject: 'S', content: 'C', date: '2024-05-01', sentBy: '', status: 'draft', response: '', responseDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'stakeholder_communication', content: args.data.content as string });
      const c = await StakeholderService.sendCommunication('mem-1', 'alice');
      assert.ok(c);
      assert.equal(c!.status, 'sent');
      assert.equal(c!.sentBy, 'alice');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const c = await StakeholderService.sendCommunication('nope', 'u');
      assert.equal(c, null);
    });
  });

  describe('logResponse', () => {
    it('logs a response to a communication', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'stakeholder_communication', content: JSON.stringify({ stakeholderId: 's1', channel: 'email', subject: 'S', content: 'C', date: '2024-05-01', sentBy: '', status: 'sent', response: '', responseDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'stakeholder_communication', content: args.data.content as string });
      const c = await StakeholderService.logResponse('mem-1', 'Looks good', '2024-05-03');
      assert.ok(c);
      assert.equal(c!.status, 'responded');
      assert.equal(c!.response, 'Looks good');
      assert.ok(c!.responseDate);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const c = await StakeholderService.logResponse('nope', 'r', '2024-05-03');
      assert.equal(c, null);
    });
  });

  // ── Matrix ──

  describe('getStakeholderMatrix', () => {
    it('groups stakeholders by engagement strategy', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 's1', content: JSON.stringify({ name: 'A', type: 'investor', organization: '', role: '', email: '', phone: '', influence: 'high', interest: 'high', category: '', notes: '', engagementStrategy: 'manage_closely' }) }),
        makeRow({ id: 's2', content: JSON.stringify({ name: 'B', type: 'other', organization: '', role: '', email: '', phone: '', influence: 'low', interest: 'low', category: '', notes: '', engagementStrategy: 'monitor' }) }),
      ];
      const matrix = await StakeholderService.getStakeholderMatrix('org-1');
      assert.equal(matrix.manageClosely.length, 1);
      assert.equal(matrix.monitor.length, 1);
      assert.equal(matrix.keepSatisfied.length, 0);
      assert.equal(matrix.keepInformed.length, 0);
    });
  });

  // ── Metrics ──

  describe('getStakeholderMetrics', () => {
    it('returns metrics with counts and averages', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'stakeholder') {
          return [
            makeRow({ id: 's1', content: JSON.stringify({ name: 'A', type: 'investor', organization: '', role: '', email: '', phone: '', influence: 'high', interest: 'high', category: '', notes: '', engagementStrategy: 'manage_closely' }) }),
            makeRow({ id: 's2', content: JSON.stringify({ name: 'B', type: 'employee', organization: '', role: '', email: '', phone: '', influence: 'low', interest: 'low', category: '', notes: '', engagementStrategy: 'monitor' }) }),
          ];
        }
        if (where.type === 'stakeholder_sentiment') {
          return [
            makeRow({ id: 'sent1', type: 'stakeholder_sentiment', content: JSON.stringify({ stakeholderId: 's1', sentiment: 'positive', score: null, date: '2024-05-01', reason: '', trend: 'stable', recordedBy: '' }) }),
          ];
        }
        if (where.type === 'stakeholder_engagement') {
          return [];
        }
        return [];
      };
      const metrics = await StakeholderService.getStakeholderMetrics('org-1');
      assert.equal(metrics.stakeholderCount, 2);
      assert.equal(metrics.stakeholderCountByType.investor, 1);
      assert.equal(metrics.stakeholderCountByType.employee, 1);
      assert.equal(metrics.avgSentiment, 1);
      assert.equal(metrics.atRiskStakeholders, 0);
    });
  });

  // ── Stats ──

  describe('getStats', () => {
    it('returns comprehensive stats', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'stakeholder') {
          return [makeRow({ id: 's1', content: JSON.stringify({ name: 'A', type: 'investor', organization: '', role: '', email: '', phone: '', influence: 'high', interest: 'high', category: '', notes: '', engagementStrategy: 'manage_closely' }) })];
        }
        if (where.type === 'stakeholder_engagement') {
          return [makeRow({ id: 'e1', type: 'stakeholder_engagement', content: JSON.stringify({ stakeholderId: 's1', type: 'meeting', date: '2024-05-01', topic: 'T', outcome: '', actionItems: [], nextSteps: '', attendees: [], status: 'completed', completedBy: '', completedAt: null }) })];
        }
        if (where.type === 'stakeholder_sentiment') {
          return [makeRow({ id: 'sent1', type: 'stakeholder_sentiment', content: JSON.stringify({ stakeholderId: 's1', sentiment: 'positive', score: null, date: '2024-05-01', reason: '', trend: 'stable', recordedBy: '' }) })];
        }
        if (where.type === 'stakeholder_communication') {
          return [makeRow({ id: 'c1', type: 'stakeholder_communication', content: JSON.stringify({ stakeholderId: 's1', channel: 'email', subject: 'S', content: 'C', date: '2024-05-01', sentBy: '', status: 'sent', response: '', responseDate: null }) })];
        }
        return [];
      };
      const stats = await StakeholderService.getStats('org-1');
      assert.equal(stats.stakeholderCount, 1);
      assert.equal(stats.engagementCount, 1);
      assert.equal(stats.sentimentCount, 1);
      assert.equal(stats.communicationCount, 1);
      assert.equal(stats.completedEngagementCount, 1);
      assert.equal(stats.sentCommunicationCount, 1);
      assert.equal(stats.byStakeholderType.investor, 1);
      assert.equal(stats.byEngagementStatus.completed, 1);
      assert.equal(stats.bySentiment.positive, 1);
      assert.equal(stats.byCommunicationStatus.sent, 1);
    });
  });
});
