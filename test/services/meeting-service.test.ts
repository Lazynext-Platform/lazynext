import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown; include?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type GroupByArgs = { by: string[]; where: Record<string, unknown>; _count: boolean };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let meetingFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let meetingFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let meetingCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let meetingUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let meetingDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let meetingCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let meetingGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  meeting: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'meeting.findMany', args }); return meetingFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'meeting.findUnique', args }); return meetingFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'meeting.create', args }); return meetingCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'meeting.update', args }); return meetingUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'meeting.delete', args }); return meetingDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'meeting.count', args }); return meetingCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'meeting.groupBy', args }); return meetingGroupByImpl(args); },
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

function resetMock(): void {
  calls.length = 0;
  meetingFindManyImpl = async () => [];
  meetingFindUniqueImpl = async () => null;
  meetingCreateImpl = async () => ({});
  meetingUpdateImpl = async () => ({});
  meetingDeleteImpl = async () => ({});
  meetingCountImpl = async () => 0;
  meetingGroupByImpl = async () => [];
}

const { MeetingService } = await import('@/lib/services/meeting-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MeetingService', () => {
  beforeEach(() => resetMock());

  describe('create', () => {
    it('creates a meeting with defaults', async () => {
      meetingCreateImpl = async (args) => ({ id: 'm1', ...args.data });
      const result = await MeetingService.create('org1', {
        title: 'Sprint Review',
        scheduledAt: new Date('2026-01-01'),
        organizerId: 'u1',
      });
      assert.equal(result.title, 'Sprint Review');
      assert.equal(result.status, 'scheduled');
      assert.equal(result.type, 'general');
      assert.equal(result.duration, 60);
    });

    it('serializes attendeeIds and agenda as JSON', async () => {
      let captured: Record<string, unknown> = {};
      meetingCreateImpl = async (args) => { captured = args.data; return { id: 'm1', ...args.data }; };
      await MeetingService.create('org1', {
        title: 'Standup',
        scheduledAt: new Date('2026-01-01'),
        organizerId: 'u1',
        attendeeIds: ['u2', 'u3'],
        agenda: ['Item 1', 'Item 2'],
      });
      assert.equal(captured.attendeeIds, JSON.stringify(['u2', 'u3']));
      assert.equal(captured.agenda, JSON.stringify(['Item 1', 'Item 2']));
    });
  });

  describe('get', () => {
    it('returns parsed meeting when found', async () => {
      meetingFindUniqueImpl = async () => ({
        id: 'm1', title: 'Test', attendeeIds: '["u1"]', agenda: '["a1"]',
        actionItems: '[]', decisions: '[]', followUps: '[]', tags: '[]',
      });
      const result = await MeetingService.get('m1');
      assert.equal(result?.id, 'm1');
      assert.deepEqual(result?.attendeeIds, ['u1']);
      assert.deepEqual(result?.agenda, ['a1']);
    });

    it('returns null when not found', async () => {
      meetingFindUniqueImpl = async () => null;
      const result = await MeetingService.get('nonexistent');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('applies filters to where clause', async () => {
      let captured: Record<string, unknown> = {};
      meetingFindManyImpl = async (args) => { captured = args.where; return []; };
      await MeetingService.list('org1', { type: 'standup', status: 'scheduled' });
      assert.equal(captured.type, 'standup');
      assert.equal(captured.status, 'scheduled');
    });

    it('returns empty array on error', async () => {
      meetingFindManyImpl = async () => { throw new Error('fail'); };
      const result = await MeetingService.list('org1');
      assert.deepEqual(result, []);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      let captured: Record<string, unknown> = {};
      meetingUpdateImpl = async (args) => { captured = args.data; return { id: 'm1' }; };
      await MeetingService.update('m1', { title: 'Updated', status: 'completed' });
      assert.equal(captured.title, 'Updated');
      assert.equal(captured.status, 'completed');
      assert.ok(!('description' in captured));
    });
  });

  describe('delete', () => {
    it('calls prisma delete', async () => {
      meetingDeleteImpl = async () => ({ id: 'm1' });
      const result = await MeetingService.delete('m1');
      assert.equal(result.id, 'm1');
    });
  });

  describe('addNotes', () => {
    it('updates notes field', async () => {
      let captured: Record<string, unknown> = {};
      meetingUpdateImpl = async (args) => { captured = args.data; return { id: 'm1' }; };
      await MeetingService.addNotes('m1', 'Meeting notes here');
      assert.equal(captured.notes, 'Meeting notes here');
    });
  });

  describe('setTranscript', () => {
    it('updates transcript field', async () => {
      let captured: Record<string, unknown> = {};
      meetingUpdateImpl = async (args) => { captured = args.data; return { id: 'm1' }; };
      await MeetingService.setTranscript('m1', 'Transcript text');
      assert.equal(captured.transcript, 'Transcript text');
    });
  });

  describe('generateAiSummary', () => {
    it('throws when meeting not found', async () => {
      meetingFindUniqueImpl = async () => null;
      await assert.rejects(() => MeetingService.generateAiSummary('m1'), /meeting_not_found/);
    });

    it('generates summary from notes', async () => {
      meetingFindUniqueImpl = async () => ({
        id: 'm1', notes: 'This is the first sentence. This is the last sentence.',
        transcript: '', actionItems: '[]', decisions: '[]',
      });
      let captured: Record<string, unknown> = {};
      meetingUpdateImpl = async (args) => { captured = args.data; return { id: 'm1' }; };
      await MeetingService.generateAiSummary('m1');
      assert.ok(String(captured.aiSummary).includes('Summary:'));
    });

    it('returns empty summary when no source text', async () => {
      meetingFindUniqueImpl = async () => ({
        id: 'm1', notes: '', transcript: '', actionItems: '[]', decisions: '[]',
      });
      let captured: Record<string, unknown> = {};
      meetingUpdateImpl = async (args) => { captured = args.data; return { id: 'm1' }; };
      await MeetingService.generateAiSummary('m1');
      assert.equal(captured.aiSummary, '');
    });
  });

  describe('extractActionItems', () => {
    it('extracts TODO and ACTION items', async () => {
      meetingFindUniqueImpl = async () => ({
        id: 'm1', notes: 'TODO: Fix bug\nACTION: Send email\nRandom text', transcript: '', actionItems: '[]',
      });
      let captured: Record<string, unknown> = {};
      meetingUpdateImpl = async (args) => { captured = args.data; return { id: 'm1' }; };
      const result = await MeetingService.extractActionItems('m1');
      assert.equal(result.actionItems.length, 2);
      assert.equal(result.actionItems[0].text, 'Fix bug');
      assert.equal(result.actionItems[1].text, 'Send email');
    });

    it('extracts checkbox-style items', async () => {
      meetingFindUniqueImpl = async () => ({
        id: 'm1', notes: '- [ ] Task one\n- [x] Done task\n* [ ] Task two', transcript: '', actionItems: '[]',
      });
      meetingUpdateImpl = async () => ({ id: 'm1' });
      const result = await MeetingService.extractActionItems('m1');
      assert.equal(result.actionItems.length, 2);
      assert.equal(result.actionItems[0].text, 'Task one');
    });
  });

  describe('extractDecisions', () => {
    it('extracts DECISION and AGREED items', async () => {
      meetingFindUniqueImpl = async () => ({
        id: 'm1', notes: 'DECISION: Use React\nAGREED: Ship Friday\nRandom text', transcript: '', decisions: '[]',
      });
      meetingUpdateImpl = async () => ({ id: 'm1' });
      const result = await MeetingService.extractDecisions('m1');
      assert.equal(result.decisions.length, 2);
      assert.equal(result.decisions[0].text, 'Use React');
      assert.equal(result.decisions[1].text, 'Ship Friday');
    });
  });

  describe('addFollowUp', () => {
    it('adds a follow-up to the meeting', async () => {
      meetingFindUniqueImpl = async () => ({
        id: 'm1', followUps: '[]',
      });
      let captured: Record<string, unknown> = {};
      meetingUpdateImpl = async (args) => { captured = args.data; return { id: 'm1' }; };
      const result = await MeetingService.addFollowUp('m1', { text: 'Follow up on X', assignee: 'u1' });
      assert.equal(result.followUp.text, 'Follow up on X');
      assert.equal(result.followUp.assignee, 'u1');
      assert.equal(result.followUp.status, 'open');
      const parsed = JSON.parse(String(captured.followUps));
      assert.equal(parsed.length, 1);
    });
  });

  describe('getFollowUps', () => {
    it('returns parsed follow-ups', async () => {
      meetingFindUniqueImpl = async () => ({ followUps: '[{"id":"fu1","text":"Test"}]' });
      const result = await MeetingService.getFollowUps('m1');
      assert.equal(result.length, 1);
      assert.equal(String((result[0] as Record<string, unknown>).text), 'Test');
    });

    it('returns empty array when meeting not found', async () => {
      meetingFindUniqueImpl = async () => null;
      const result = await MeetingService.getFollowUps('nonexistent');
      assert.deepEqual(result, []);
    });
  });

  describe('completeFollowUp', () => {
    it('marks a follow-up as completed', async () => {
      meetingFindUniqueImpl = async () => ({
        id: 'm1', followUps: '[{"id":"fu1","text":"Test","status":"open"}]',
      });
      let captured: Record<string, unknown> = {};
      meetingUpdateImpl = async (args) => { captured = args.data; return { id: 'm1' }; };
      const result = await MeetingService.completeFollowUp('m1', 'fu1');
      const parsed = JSON.parse(String(captured.followUps));
      assert.equal(parsed[0].status, 'completed');
      assert.ok(parsed[0].completedAt);
      assert.equal(result.followUps[0].status, 'completed');
    });
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      meetingCountImpl = async () => 10;
      meetingGroupByImpl = async (args) => {
        if (args.by[0] === 'type') return [{ type: 'standup', _count: 5 }, { type: 'review', _count: 5 }];
        if (args.by[0] === 'status') return [{ status: 'completed', _count: 8 }, { status: 'scheduled', _count: 2 }];
        return [];
      };
      meetingFindManyImpl = async () => {
        // Called twice: for durations and for actionItems/decisions
        return [{ duration: 60 }, { duration: 30 }];
      };
      const result = await MeetingService.getStats('org1');
      assert.equal(result.total, 10);
      assert.equal(result.byType.standup, 5);
      assert.equal(result.byStatus.completed, 8);
    });
  });

  describe('getUpcoming', () => {
    it('returns meetings in date range', async () => {
      meetingFindManyImpl = async () => [{
        id: 'm1', title: 'Upcoming', attendeeIds: '[]', agenda: '[]',
        actionItems: '[]', decisions: '[]', followUps: '[]', tags: '[]',
      }];
      const result = await MeetingService.getUpcoming('org1', 7);
      assert.equal(result.length, 1);
      assert.equal(result[0].title, 'Upcoming');
    });
  });

  describe('getActionItems', () => {
    it('returns action items across meetings with filters', async () => {
      meetingFindManyImpl = async () => [{
        id: 'm1', title: 'Meeting 1', scheduledAt: new Date('2026-01-01'),
        actionItems: '[{"id":"ai1","text":"Task","status":"open","assignee":"u1"}]',
      }];
      const result = await MeetingService.getActionItems('org1', { status: 'open' });
      assert.equal(result.length, 1);
      assert.equal(result[0].text, 'Task');
      assert.equal(result[0].meetingId, 'm1');
    });

    it('filters by assignee', async () => {
      meetingFindManyImpl = async () => [{
        id: 'm1', title: 'M1', scheduledAt: new Date(),
        actionItems: '[{"id":"ai1","text":"T1","status":"open","assignee":"u1"},{"id":"ai2","text":"T2","status":"open","assignee":"u2"}]',
      }];
      const result = await MeetingService.getActionItems('org1', { assignee: 'u1' });
      assert.equal(result.length, 1);
      assert.equal(result[0].assignee, 'u1');
    });
  });
});
