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
    type: 'pr_press_release',
    content: JSON.stringify({ title: 'Test', content: '', summary: '', status: 'draft', publishDate: null, embargoDate: null, author: '', distributionList: [], tags: [], mediaAssets: [], publishedBy: '', publishedAt: null }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['pr_press_release', 'draft']),
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

const { CommunicationsService } = await import('@/lib/services/communications-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CommunicationsService', () => {
  beforeEach(() => { resetMock(); });

  // ── Press Releases ──

  describe('createPressRelease', () => {
    it('creates a press release with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pr_press_release', content: args.data.content as string });
      const pr = await CommunicationsService.createPressRelease('org-1', 'ws-1', { title: 'Launch', content: 'Body', status: 'draft' }, 'user-1');
      assert.equal(pr.title, 'Launch');
      assert.equal(pr.content, 'Body');
      assert.equal(pr.status, 'draft');
      assert.equal(pr.organizationId, 'org-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pr_press_release', content: args.data.content as string });
      const pr = await CommunicationsService.createPressRelease('org-1', 'ws-1', {
        title: 'Update', content: 'Body', summary: 's', status: 'approved', publishDate: '2024-06-01', author: 'alice', distributionList: ['a@b.com'], tags: ['tech'],
      }, 'user-1');
      assert.equal(pr.summary, 's');
      assert.equal(pr.status, 'approved');
      assert.equal(pr.author, 'alice');
      assert.equal(pr.distributionList.length, 1);
    });
  });

  describe('getPressRelease', () => {
    it('returns a press release when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_press_release' });
      const pr = await CommunicationsService.getPressRelease('mem-1');
      assert.ok(pr);
      assert.equal(pr!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const pr = await CommunicationsService.getPressRelease('nope');
      assert.equal(pr, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_media_contact' });
      const pr = await CommunicationsService.getPressRelease('mem-1');
      assert.equal(pr, null);
    });
  });

  describe('listPressReleases', () => {
    it('lists press releases', async () => {
      memFindManyImpl = async () => [makeRow({ id: 'pr1' }), makeRow({ id: 'pr2' })];
      const list = await CommunicationsService.listPressReleases('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by status and author', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'pr1', content: JSON.stringify({ title: 'A', content: '', summary: '', status: 'published', publishDate: null, embargoDate: null, author: 'alice', distributionList: [], tags: [], mediaAssets: [], publishedBy: '', publishedAt: null }) }),
        makeRow({ id: 'pr2', content: JSON.stringify({ title: 'B', content: '', summary: '', status: 'draft', publishDate: null, embargoDate: null, author: 'bob', distributionList: [], tags: [], mediaAssets: [], publishedBy: '', publishedAt: null }) }),
      ];
      const list = await CommunicationsService.listPressReleases('org-1', { status: 'published', author: 'alice' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updatePressRelease', () => {
    it('updates press release fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_press_release' });
      memUpdateImpl = async (args) => makeRow({ type: 'pr_press_release', content: args.data.content as string });
      const pr = await CommunicationsService.updatePressRelease('mem-1', { title: 'Updated', status: 'approved' });
      assert.ok(pr);
      assert.equal(pr!.title, 'Updated');
      assert.equal(pr!.status, 'approved');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const pr = await CommunicationsService.updatePressRelease('nope', { title: 'X' });
      assert.equal(pr, null);
    });
  });

  describe('publishPressRelease', () => {
    it('publishes a press release', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_press_release', content: JSON.stringify({ title: 'PR', content: '', summary: '', status: 'approved', publishDate: null, embargoDate: null, author: '', distributionList: [], tags: [], mediaAssets: [], publishedBy: '', publishedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'pr_press_release', content: args.data.content as string });
      const pr = await CommunicationsService.publishPressRelease('mem-1', 'publisher');
      assert.ok(pr);
      assert.equal(pr!.status, 'published');
      assert.equal(pr!.publishedBy, 'publisher');
      assert.ok(pr!.publishedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const pr = await CommunicationsService.publishPressRelease('nope', 'u');
      assert.equal(pr, null);
    });
  });

  describe('deletePressRelease', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await CommunicationsService.deletePressRelease('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await CommunicationsService.deletePressRelease('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Media Contacts ──

  describe('createMediaContact', () => {
    it('creates a media contact with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pr_media_contact', content: args.data.content as string });
      const c = await CommunicationsService.createMediaContact('org-1', 'ws-1', { name: 'John', outlet: 'TechCrunch' }, 'user-1');
      assert.equal(c.name, 'John');
      assert.equal(c.outlet, 'TechCrunch');
      assert.equal(c.status, 'active');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pr_media_contact', content: args.data.content as string });
      const c = await CommunicationsService.createMediaContact('org-1', 'ws-1', {
        name: 'Jane', outlet: 'Forbes', role: 'Editor', email: 'j@f.com', beat: 'tech', relationship: 'good', status: 'inactive',
      }, 'user-1');
      assert.equal(c.role, 'Editor');
      assert.equal(c.email, 'j@f.com');
      assert.equal(c.beat, 'tech');
      assert.equal(c.status, 'inactive');
    });
  });

  describe('getMediaContact', () => {
    it('returns a media contact when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_media_contact', content: JSON.stringify({ name: 'C', outlet: '', role: '', email: '', phone: '', beat: '', relationship: '', notes: '', status: 'active' }) });
      const c = await CommunicationsService.getMediaContact('mem-1');
      assert.ok(c);
      assert.equal(c!.name, 'C');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_press_release' });
      const c = await CommunicationsService.getMediaContact('mem-1');
      assert.equal(c, null);
    });
  });

  describe('listMediaContacts', () => {
    it('lists media contacts and filters by outlet, beat, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'pr_media_contact', content: JSON.stringify({ name: 'A', outlet: 'TechCrunch', role: '', email: '', phone: '', beat: 'tech', relationship: '', notes: '', status: 'active' }) }),
        makeRow({ id: 'c2', type: 'pr_media_contact', content: JSON.stringify({ name: 'B', outlet: 'Forbes', role: '', email: '', phone: '', beat: 'finance', relationship: '', notes: '', status: 'blacklisted' }) }),
      ];
      const list = await CommunicationsService.listMediaContacts('org-1', { outlet: 'TechCrunch', beat: 'tech', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateMediaContact', () => {
    it('updates media contact fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_media_contact', content: JSON.stringify({ name: 'Old', outlet: '', role: '', email: '', phone: '', beat: '', relationship: '', notes: '', status: 'active' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'pr_media_contact', content: args.data.content as string });
      const c = await CommunicationsService.updateMediaContact('mem-1', { name: 'New', status: 'blacklisted' });
      assert.ok(c);
      assert.equal(c!.name, 'New');
      assert.equal(c!.status, 'blacklisted');
    });
  });

  describe('deleteMediaContact', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await CommunicationsService.deleteMediaContact('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Crises ──

  describe('createCrisis', () => {
    it('creates a crisis with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pr_crisis', content: args.data.content as string });
      const c = await CommunicationsService.createCrisis('org-1', 'ws-1', { title: 'Data Breach', severity: 'high', type: 'data_breach' }, 'user-1');
      assert.equal(c.title, 'Data Breach');
      assert.equal(c.severity, 'high');
      assert.equal(c.type, 'data_breach');
      assert.equal(c.status, 'monitoring');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pr_crisis', content: args.data.content as string });
      const c = await CommunicationsService.createCrisis('org-1', 'ws-1', {
        title: 'Outage', description: 'd', severity: 'critical', type: 'operational', status: 'active', spokesperson: 'CEO', mediaInquiries: 5, affectedAudiences: ['customers'], actionPlan: 'fix it',
      }, 'user-1');
      assert.equal(c.spokesperson, 'CEO');
      assert.equal(c.mediaInquiries, 5);
      assert.equal(c.affectedAudiences.length, 1);
    });
  });

  describe('getCrisis', () => {
    it('returns a crisis when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_crisis', content: JSON.stringify({ title: 'C', description: '', severity: 'medium', type: 'other', status: 'monitoring', spokesperson: '', statements: [], mediaInquiries: 0, affectedAudiences: [], actionPlan: '', timeline: [], activatedBy: '', activatedAt: null, resolvedBy: '', resolvedAt: null, resolution: '' }) });
      const c = await CommunicationsService.getCrisis('mem-1');
      assert.ok(c);
      assert.equal(c!.title, 'C');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_press_release' });
      const c = await CommunicationsService.getCrisis('mem-1');
      assert.equal(c, null);
    });
  });

  describe('listCrises', () => {
    it('lists crises and filters by severity, status, type', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'pr_crisis', content: JSON.stringify({ title: 'A', description: '', severity: 'high', type: 'data_breach', status: 'active', spokesperson: '', statements: [], mediaInquiries: 0, affectedAudiences: [], actionPlan: '', timeline: [], activatedBy: '', activatedAt: null, resolvedBy: '', resolvedAt: null, resolution: '' }) }),
        makeRow({ id: 'c2', type: 'pr_crisis', content: JSON.stringify({ title: 'B', description: '', severity: 'low', type: 'operational', status: 'resolved', spokesperson: '', statements: [], mediaInquiries: 0, affectedAudiences: [], actionPlan: '', timeline: [], activatedBy: '', activatedAt: null, resolvedBy: '', resolvedAt: null, resolution: '' }) }),
      ];
      const list = await CommunicationsService.listCrises('org-1', { severity: 'high', status: 'active', type: 'data_breach' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateCrisis', () => {
    it('updates crisis fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_crisis', content: JSON.stringify({ title: 'Old', description: '', severity: 'medium', type: 'other', status: 'monitoring', spokesperson: '', statements: [], mediaInquiries: 0, affectedAudiences: [], actionPlan: '', timeline: [], activatedBy: '', activatedAt: null, resolvedBy: '', resolvedAt: null, resolution: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'pr_crisis', content: args.data.content as string });
      const c = await CommunicationsService.updateCrisis('mem-1', { title: 'New', status: 'contained' });
      assert.ok(c);
      assert.equal(c!.title, 'New');
      assert.equal(c!.status, 'contained');
    });
  });

  describe('activateCrisis', () => {
    it('activates a crisis', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_crisis', content: JSON.stringify({ title: 'C', description: '', severity: 'medium', type: 'other', status: 'monitoring', spokesperson: '', statements: [], mediaInquiries: 0, affectedAudiences: [], actionPlan: '', timeline: [], activatedBy: '', activatedAt: null, resolvedBy: '', resolvedAt: null, resolution: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'pr_crisis', content: args.data.content as string });
      const c = await CommunicationsService.activateCrisis('mem-1', 'admin');
      assert.ok(c);
      assert.equal(c!.status, 'active');
      assert.equal(c!.activatedBy, 'admin');
      assert.ok(c!.activatedAt);
    });
  });

  describe('resolveCrisis', () => {
    it('resolves a crisis', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_crisis', content: JSON.stringify({ title: 'C', description: '', severity: 'medium', type: 'other', status: 'active', spokesperson: '', statements: [], mediaInquiries: 0, affectedAudiences: [], actionPlan: '', timeline: [], activatedBy: '', activatedAt: null, resolvedBy: '', resolvedAt: null, resolution: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'pr_crisis', content: args.data.content as string });
      const c = await CommunicationsService.resolveCrisis('mem-1', 'fixed', 'admin');
      assert.ok(c);
      assert.equal(c!.status, 'resolved');
      assert.equal(c!.resolution, 'fixed');
      assert.equal(c!.resolvedBy, 'admin');
      assert.ok(c!.resolvedAt);
    });
  });

  describe('addStatement', () => {
    it('adds a statement to a crisis', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_crisis', content: JSON.stringify({ title: 'C', description: '', severity: 'medium', type: 'other', status: 'active', spokesperson: '', statements: [], mediaInquiries: 0, affectedAudiences: [], actionPlan: '', timeline: [], activatedBy: '', activatedAt: null, resolvedBy: '', resolvedAt: null, resolution: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'pr_crisis', content: args.data.content as string });
      const c = await CommunicationsService.addStatement('mem-1', { date: '2024-05-01', channel: 'press', content: 'statement' }, 'spokesperson');
      assert.ok(c);
      assert.equal(c!.statements.length, 1);
      assert.equal(c!.statements[0].content, 'statement');
    });
  });

  // ── Mentions ──

  describe('createMention', () => {
    it('creates a mention with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pr_mention', content: args.data.content as string });
      const m = await CommunicationsService.createMention('org-1', 'ws-1', { source: 'news', outlet: 'TechCrunch', title: 'Article', sentiment: 'positive', date: '2024-05-01' }, 'user-1');
      assert.equal(m.title, 'Article');
      assert.equal(m.source, 'news');
      assert.equal(m.sentiment, 'positive');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pr_mention', content: args.data.content as string });
      const m = await CommunicationsService.createMention('org-1', 'ws-1', {
        source: 'blog', outlet: 'Medium', title: 'Post', url: 'http://x.com', sentiment: 'neutral', reach: 5000, date: '2024-05-01', author: 'bob', summary: 's', tags: ['t'],
      }, 'user-1');
      assert.equal(m.url, 'http://x.com');
      assert.equal(m.reach, 5000);
      assert.equal(m.author, 'bob');
    });
  });

  describe('getMention', () => {
    it('returns a mention when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_mention', content: JSON.stringify({ source: 'news', outlet: '', title: 'M', url: '', sentiment: 'neutral', reach: null, date: '2024-05-01', author: '', summary: '', tags: [] }) });
      const m = await CommunicationsService.getMention('mem-1');
      assert.ok(m);
      assert.equal(m!.title, 'M');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_press_release' });
      const m = await CommunicationsService.getMention('mem-1');
      assert.equal(m, null);
    });
  });

  describe('listMentions', () => {
    it('lists mentions and filters by sentiment, source, outlet', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'm1', type: 'pr_mention', content: JSON.stringify({ source: 'news', outlet: 'TC', title: 'A', url: '', sentiment: 'positive', reach: null, date: '2024-05-01', author: '', summary: '', tags: [] }) }),
        makeRow({ id: 'm2', type: 'pr_mention', content: JSON.stringify({ source: 'social', outlet: 'Twitter', title: 'B', url: '', sentiment: 'negative', reach: null, date: '2024-05-02', author: '', summary: '', tags: [] }) }),
      ];
      const list = await CommunicationsService.listMentions('org-1', { sentiment: 'positive', source: 'news', outlet: 'TC' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateMention', () => {
    it('updates mention fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_mention', content: JSON.stringify({ source: 'news', outlet: '', title: 'Old', url: '', sentiment: 'neutral', reach: null, date: '2024-05-01', author: '', summary: '', tags: [] }) });
      memUpdateImpl = async (args) => makeRow({ type: 'pr_mention', content: args.data.content as string });
      const m = await CommunicationsService.updateMention('mem-1', { title: 'New', sentiment: 'positive' });
      assert.ok(m);
      assert.equal(m!.title, 'New');
      assert.equal(m!.sentiment, 'positive');
    });
  });

  describe('deleteMention', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await CommunicationsService.deleteMention('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Speaker Opportunities ──

  describe('createSpeakerOpportunity', () => {
    it('creates a speaker opportunity with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pr_speaker_opportunity', content: args.data.content as string });
      const s = await CommunicationsService.createSpeakerOpportunity('org-1', 'ws-1', { event: 'Conf', date: '2024-06-01', status: 'identified' }, 'user-1');
      assert.equal(s.event, 'Conf');
      assert.equal(s.status, 'identified');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pr_speaker_opportunity', content: args.data.content as string });
      const s = await CommunicationsService.createSpeakerOpportunity('org-1', 'ws-1', {
        event: 'Summit', date: '2024-07-01', location: 'NYC', audience: 'tech', topic: 'AI', speaker: 'CEO', status: 'pitched', deadline: '2024-05-01',
      }, 'user-1');
      assert.equal(s.location, 'NYC');
      assert.equal(s.topic, 'AI');
      assert.equal(s.speaker, 'CEO');
      assert.equal(s.status, 'pitched');
    });
  });

  describe('getSpeakerOpportunity', () => {
    it('returns a speaker opportunity when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_speaker_opportunity', content: JSON.stringify({ event: 'E', date: '2024-06-01', location: '', audience: '', topic: '', speaker: '', status: 'identified', deadline: null, notes: '' }) });
      const s = await CommunicationsService.getSpeakerOpportunity('mem-1');
      assert.ok(s);
      assert.equal(s!.event, 'E');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_press_release' });
      const s = await CommunicationsService.getSpeakerOpportunity('mem-1');
      assert.equal(s, null);
    });
  });

  describe('listSpeakerOpportunities', () => {
    it('lists speaker opportunities and filters by status, speaker', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 's1', type: 'pr_speaker_opportunity', content: JSON.stringify({ event: 'A', date: '2024-06-01', location: '', audience: '', topic: '', speaker: 'CEO', status: 'accepted', deadline: null, notes: '' }) }),
        makeRow({ id: 's2', type: 'pr_speaker_opportunity', content: JSON.stringify({ event: 'B', date: '2024-07-01', location: '', audience: '', topic: '', speaker: 'CTO', status: 'declined', deadline: null, notes: '' }) }),
      ];
      const list = await CommunicationsService.listSpeakerOpportunities('org-1', { status: 'accepted', speaker: 'CEO' });
      assert.equal(list.length, 1);
      assert.equal(list[0].event, 'A');
    });
  });

  describe('updateSpeakerOpportunity', () => {
    it('updates speaker opportunity fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pr_speaker_opportunity', content: JSON.stringify({ event: 'Old', date: '2024-06-01', location: '', audience: '', topic: '', speaker: '', status: 'identified', deadline: null, notes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'pr_speaker_opportunity', content: args.data.content as string });
      const s = await CommunicationsService.updateSpeakerOpportunity('mem-1', { event: 'New', status: 'completed' });
      assert.ok(s);
      assert.equal(s!.event, 'New');
      assert.equal(s!.status, 'completed');
    });
  });

  // ── PR Metrics & Stats ──

  describe('getPRMetrics', () => {
    it('computes metrics across press releases, mentions, crises, speakers', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'pr_press_release') return [
          makeRow({ id: 'pr1', type: 'pr_press_release', content: JSON.stringify({ title: 'A', content: '', summary: '', status: 'published', publishDate: null, embargoDate: null, author: '', distributionList: [], tags: [], mediaAssets: [], publishedBy: '', publishedAt: null }) }),
        ];
        if (where.type === 'pr_mention') return [
          makeRow({ id: 'm1', type: 'pr_mention', content: JSON.stringify({ source: 'news', outlet: '', title: 'M1', url: '', sentiment: 'positive', reach: 1000, date: '2024-05-01', author: '', summary: '', tags: [] }) }),
          makeRow({ id: 'm2', type: 'pr_mention', content: JSON.stringify({ source: 'news', outlet: '', title: 'M2', url: '', sentiment: 'negative', reach: 500, date: '2024-05-02', author: '', summary: '', tags: [] }) }),
        ];
        if (where.type === 'pr_crisis') return [
          makeRow({ id: 'c1', type: 'pr_crisis', content: JSON.stringify({ title: 'C', description: '', severity: 'high', type: 'other', status: 'active', spokesperson: '', statements: [], mediaInquiries: 0, affectedAudiences: [], actionPlan: '', timeline: [], activatedBy: '', activatedAt: null, resolvedBy: '', resolvedAt: null, resolution: '' }) }),
        ];
        if (where.type === 'pr_speaker_opportunity') return [
          makeRow({ id: 's1', type: 'pr_speaker_opportunity', content: JSON.stringify({ event: 'E', date: '2024-06-01', location: '', audience: '', topic: '', speaker: '', status: 'accepted', deadline: null, notes: '' }) }),
        ];
        return [];
      };
      const m = await CommunicationsService.getPRMetrics('org-1');
      assert.equal(m.pressReleasesByStatus['published'], 1);
      assert.equal(m.mentionsBySentiment['positive'], 1);
      assert.equal(m.mentionsBySentiment['negative'], 1);
      assert.equal(m.shareOfVoice, 1500);
      assert.equal(m.activeCrisisCount, 1);
      assert.equal(m.acceptedSpeakerCount, 1);
    });

    it('returns zero metrics when no data', async () => {
      memFindManyImpl = async () => [];
      const m = await CommunicationsService.getPRMetrics('org-1');
      assert.equal(m.crisisCount, 0);
      assert.equal(m.shareOfVoice, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates stats correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'pr_press_release') return [makeRow({ type: 'pr_press_release', content: JSON.stringify({ title: 'A', content: '', summary: '', status: 'published', publishDate: null, embargoDate: null, author: '', distributionList: [], tags: [], mediaAssets: [], publishedBy: '', publishedAt: null }) })];
        if (where.type === 'pr_media_contact') return [makeRow({ type: 'pr_media_contact', content: JSON.stringify({ name: 'C', outlet: '', role: '', email: '', phone: '', beat: '', relationship: '', notes: '', status: 'active' }) })];
        if (where.type === 'pr_crisis') return [makeRow({ type: 'pr_crisis', content: JSON.stringify({ title: 'C', description: '', severity: 'high', type: 'other', status: 'active', spokesperson: '', statements: [], mediaInquiries: 0, affectedAudiences: [], actionPlan: '', timeline: [], activatedBy: '', activatedAt: null, resolvedBy: '', resolvedAt: null, resolution: '' }) })];
        if (where.type === 'pr_mention') return [makeRow({ type: 'pr_mention', content: JSON.stringify({ source: 'news', outlet: '', title: 'M', url: '', sentiment: 'positive', reach: null, date: '2024-05-01', author: '', summary: '', tags: [] }) })];
        if (where.type === 'pr_speaker_opportunity') return [makeRow({ type: 'pr_speaker_opportunity', content: JSON.stringify({ event: 'E', date: '2024-06-01', location: '', audience: '', topic: '', speaker: '', status: 'accepted', deadline: null, notes: '' }) })];
        return [];
      };
      const stats = await CommunicationsService.getStats('org-1');
      assert.equal(stats.pressReleaseCount, 1);
      assert.equal(stats.publishedPressReleaseCount, 1);
      assert.equal(stats.mediaContactCount, 1);
      assert.equal(stats.activeMediaContactCount, 1);
      assert.equal(stats.crisisCount, 1);
      assert.equal(stats.activeCrisisCount, 1);
      assert.equal(stats.mentionCount, 1);
      assert.equal(stats.positiveMentionCount, 1);
      assert.equal(stats.speakerOpportunityCount, 1);
      assert.equal(stats.acceptedSpeakerCount, 1);
      assert.equal(stats.byPressReleaseStatus['published'], 1);
      assert.equal(stats.byMentionSentiment['positive'], 1);
    });
  });
});
