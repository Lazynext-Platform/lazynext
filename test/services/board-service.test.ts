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
    type: 'board_meeting',
    content: JSON.stringify({ title: 'Test', date: '2024-06-01', location: 'HQ', type: 'regular', agenda: [], attendees: [], status: 'scheduled', minutes: '', actionItems: [], nextMeetingDate: null, cancelledReason: null, cancelledBy: null, minutesFinalizedBy: null }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['board_meeting', 'regular', 'scheduled']),
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

const { BoardService } = await import('@/lib/services/board-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('BoardService', () => {
  beforeEach(() => { resetMock(); });

  // ── Meetings ──

  describe('createMeeting', () => {
    it('creates a meeting with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'board_meeting', content: args.data.content as string });
      const meeting = await BoardService.createMeeting('org-1', 'ws-1', { title: 'Q2 Board Meeting', date: '2024-06-01', type: 'regular', agenda: [{ item: 'Review Q1' }] }, 'user-1');
      assert.equal(meeting.title, 'Q2 Board Meeting');
      assert.equal(meeting.type, 'regular');
      assert.equal(meeting.status, 'scheduled');
      assert.equal(meeting.location, '');
      assert.equal(meeting.agenda.length, 1);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'board_meeting', content: args.data.content as string });
      const meeting = await BoardService.createMeeting('org-1', 'ws-1', {
        title: 'Annual', date: '2024-12-01', type: 'annual', agenda: [],
        location: 'Office', attendees: ['alice', 'bob'], status: 'completed',
        minutes: 'm', actionItems: ['a1'], nextMeetingDate: '2025-01-01',
      }, 'user-1');
      assert.equal(meeting.location, 'Office');
      assert.equal(meeting.attendees.length, 2);
      assert.equal(meeting.status, 'completed');
      assert.equal(meeting.actionItems.length, 1);
    });
  });

  describe('getMeeting', () => {
    it('returns a meeting when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_meeting' });
      const meeting = await BoardService.getMeeting('mem-1');
      assert.ok(meeting);
      assert.equal(meeting!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const meeting = await BoardService.getMeeting('nope');
      assert.equal(meeting, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_resolution' });
      const meeting = await BoardService.getMeeting('mem-1');
      assert.equal(meeting, null);
    });
  });

  describe('listMeetings', () => {
    it('lists meetings and filters by type and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'm1', content: JSON.stringify({ title: 'A', date: '2024-06-01', location: '', type: 'regular', agenda: [], attendees: [], status: 'scheduled', minutes: '', actionItems: [], nextMeetingDate: null, cancelledReason: null, cancelledBy: null, minutesFinalizedBy: null }) }),
        makeRow({ id: 'm2', content: JSON.stringify({ title: 'B', date: '2024-06-02', location: '', type: 'special', agenda: [], attendees: [], status: 'completed', minutes: '', actionItems: [], nextMeetingDate: null, cancelledReason: null, cancelledBy: null, minutesFinalizedBy: null }) }),
      ];
      const list = await BoardService.listMeetings('org-1', { type: 'regular', status: 'scheduled' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'regular');
    });
  });

  describe('updateMeeting', () => {
    it('updates meeting fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_meeting' });
      memUpdateImpl = async (args) => makeRow({ type: 'board_meeting', content: args.data.content as string });
      const meeting = await BoardService.updateMeeting('mem-1', { title: 'Updated', status: 'completed' });
      assert.ok(meeting);
      assert.equal(meeting!.title, 'Updated');
      assert.equal(meeting!.status, 'completed');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const meeting = await BoardService.updateMeeting('nope', { title: 'X' });
      assert.equal(meeting, null);
    });
  });

  describe('cancelMeeting', () => {
    it('cancels a meeting', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_meeting' });
      memUpdateImpl = async (args) => makeRow({ type: 'board_meeting', content: args.data.content as string });
      const meeting = await BoardService.cancelMeeting('mem-1', 'quorum not met', 'user-1');
      assert.ok(meeting);
      assert.equal(meeting!.status, 'cancelled');
      assert.equal(meeting!.cancelledReason, 'quorum not met');
      assert.equal(meeting!.cancelledBy, 'user-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const meeting = await BoardService.cancelMeeting('nope', 'r', 'u');
      assert.equal(meeting, null);
    });
  });

  describe('finalizeMinutes', () => {
    it('finalizes minutes and marks completed', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_meeting' });
      memUpdateImpl = async (args) => makeRow({ type: 'board_meeting', content: args.data.content as string });
      const meeting = await BoardService.finalizeMinutes('mem-1', 'minutes text', 'user-1');
      assert.ok(meeting);
      assert.equal(meeting!.status, 'completed');
      assert.equal(meeting!.minutes, 'minutes text');
      assert.equal(meeting!.minutesFinalizedBy, 'user-1');
    });
  });

  // ── Resolutions ──

  describe('createResolution', () => {
    it('creates a resolution with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'board_resolution', content: args.data.content as string });
      const res = await BoardService.createResolution('org-1', 'ws-1', { title: 'Approve Budget', type: 'ordinary', proposedBy: 'alice' }, 'user-1');
      assert.equal(res.title, 'Approve Budget');
      assert.equal(res.type, 'ordinary');
      assert.equal(res.status, 'proposed');
      assert.equal(res.proposedBy, 'alice');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'board_resolution', content: args.data.content as string });
      const res = await BoardService.createResolution('org-1', 'ws-1', {
        title: 'Special', type: 'special', proposedBy: 'bob', description: 'd',
        voteDeadline: '2024-12-01', status: 'voting', votes: [{ member: 'alice', vote: 'yes' }],
        outcome: 'pending', attachments: ['a.pdf'],
      }, 'user-1');
      assert.equal(res.description, 'd');
      assert.equal(res.status, 'voting');
      assert.equal(res.votes.length, 1);
      assert.equal(res.attachments.length, 1);
    });
  });

  describe('getResolution', () => {
    it('returns a resolution when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_resolution', content: JSON.stringify({ title: 'R', description: '', type: 'ordinary', proposedBy: 'a', voteDeadline: null, status: 'proposed', votes: [], outcome: '', attachments: [], finalizedBy: null }) });
      const res = await BoardService.getResolution('mem-1');
      assert.ok(res);
      assert.equal(res!.title, 'R');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_meeting' });
      const res = await BoardService.getResolution('mem-1');
      assert.equal(res, null);
    });
  });

  describe('listResolutions', () => {
    it('lists resolutions and filters by type and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'r1', type: 'board_resolution', content: JSON.stringify({ title: 'A', description: '', type: 'ordinary', proposedBy: '', voteDeadline: null, status: 'proposed', votes: [], outcome: '', attachments: [], finalizedBy: null }) }),
        makeRow({ id: 'r2', type: 'board_resolution', content: JSON.stringify({ title: 'B', description: '', type: 'special', proposedBy: '', voteDeadline: null, status: 'passed', votes: [], outcome: '', attachments: [], finalizedBy: null }) }),
      ];
      const list = await BoardService.listResolutions('org-1', { type: 'ordinary', status: 'proposed' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'ordinary');
    });
  });

  describe('castVote', () => {
    it('casts a new vote and transitions to voting', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_resolution', content: JSON.stringify({ title: 'R', description: '', type: 'ordinary', proposedBy: '', voteDeadline: null, status: 'proposed', votes: [], outcome: '', attachments: [], finalizedBy: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'board_resolution', content: args.data.content as string });
      const res = await BoardService.castVote('mem-1', 'alice', 'yes');
      assert.ok(res);
      assert.equal(res!.status, 'voting');
      assert.equal(res!.votes.length, 1);
      assert.equal(res!.votes[0].vote, 'yes');
    });

    it('updates an existing vote', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_resolution', content: JSON.stringify({ title: 'R', description: '', type: 'ordinary', proposedBy: '', voteDeadline: null, status: 'voting', votes: [{ member: 'alice', vote: 'yes', date: '2024-01-01' }], outcome: '', attachments: [], finalizedBy: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'board_resolution', content: args.data.content as string });
      const res = await BoardService.castVote('mem-1', 'alice', 'no');
      assert.ok(res);
      assert.equal(res!.votes.length, 1);
      assert.equal(res!.votes[0].vote, 'no');
    });
  });

  describe('finalizeResolution', () => {
    it('finalizes as passed when yes > no', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_resolution', content: JSON.stringify({ title: 'R', description: '', type: 'ordinary', proposedBy: '', voteDeadline: null, status: 'voting', votes: [{ member: 'a', vote: 'yes', date: '2024-01-01' }, { member: 'b', vote: 'no', date: '2024-01-01' }, { member: 'c', vote: 'yes', date: '2024-01-01' }], outcome: '', attachments: [], finalizedBy: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'board_resolution', content: args.data.content as string });
      const res = await BoardService.finalizeResolution('mem-1', 'approved', 'user-1');
      assert.ok(res);
      assert.equal(res!.status, 'passed');
      assert.equal(res!.outcome, 'approved');
      assert.equal(res!.finalizedBy, 'user-1');
    });

    it('finalizes as failed when no >= yes', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_resolution', content: JSON.stringify({ title: 'R', description: '', type: 'ordinary', proposedBy: '', voteDeadline: null, status: 'voting', votes: [{ member: 'a', vote: 'no', date: '2024-01-01' }, { member: 'b', vote: 'no', date: '2024-01-01' }], outcome: '', attachments: [], finalizedBy: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'board_resolution', content: args.data.content as string });
      const res = await BoardService.finalizeResolution('mem-1', 'rejected', 'user-1');
      assert.ok(res);
      assert.equal(res!.status, 'failed');
    });
  });

  // ── Committees ──

  describe('createCommittee', () => {
    it('creates a committee with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'board_committee', content: args.data.content as string });
      const com = await BoardService.createCommittee('org-1', 'ws-1', { name: 'Audit Committee', type: 'audit' }, 'user-1');
      assert.equal(com.name, 'Audit Committee');
      assert.equal(com.type, 'audit');
      assert.equal(com.status, 'active');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'board_committee', content: args.data.content as string });
      const com = await BoardService.createCommittee('org-1', 'ws-1', {
        name: 'Comp', type: 'compensation', charter: 'c', members: [{ name: 'alice', role: 'chair' }],
        chair: 'alice', meetingFrequency: 'quarterly', status: 'inactive', establishedDate: '2024-01-01',
      }, 'user-1');
      assert.equal(com.charter, 'c');
      assert.equal(com.members.length, 1);
      assert.equal(com.chair, 'alice');
      assert.equal(com.meetingFrequency, 'quarterly');
    });
  });

  describe('getCommittee', () => {
    it('returns a committee when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_committee', content: JSON.stringify({ name: 'C', type: 'audit', charter: '', members: [], chair: '', meetingFrequency: '', status: 'active', establishedDate: null }) });
      const com = await BoardService.getCommittee('mem-1');
      assert.ok(com);
      assert.equal(com!.name, 'C');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_meeting' });
      const com = await BoardService.getCommittee('mem-1');
      assert.equal(com, null);
    });
  });

  describe('listCommittees', () => {
    it('lists committees and filters by type and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'board_committee', content: JSON.stringify({ name: 'A', type: 'audit', charter: '', members: [], chair: '', meetingFrequency: '', status: 'active', establishedDate: null }) }),
        makeRow({ id: 'c2', type: 'board_committee', content: JSON.stringify({ name: 'B', type: 'risk', charter: '', members: [], chair: '', meetingFrequency: '', status: 'dissolved', establishedDate: null }) }),
      ];
      const list = await BoardService.listCommittees('org-1', { type: 'audit', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'audit');
    });
  });

  describe('deleteCommittee', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await BoardService.deleteCommittee('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await BoardService.deleteCommittee('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Members ──

  describe('createMember', () => {
    it('creates a member with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'board_member', content: args.data.content as string });
      const mem = await BoardService.createMember('org-1', 'ws-1', { name: 'Alice', role: 'chair' }, 'user-1');
      assert.equal(mem.name, 'Alice');
      assert.equal(mem.role, 'chair');
      assert.equal(mem.status, 'active');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'board_member', content: args.data.content as string });
      const mem = await BoardService.createMember('org-1', 'ws-1', {
        name: 'Bob', role: 'director', email: 'bob@test.com', phone: '123',
        expertise: 'finance', committees: ['audit'], termStart: '2024-01-01',
        termEnd: '2027-01-01', status: 'inactive', bio: 'b', compensation: '$50k',
      }, 'user-1');
      assert.equal(mem.email, 'bob@test.com');
      assert.equal(mem.expertise, 'finance');
      assert.equal(mem.committees.length, 1);
      assert.equal(mem.compensation, '$50k');
    });
  });

  describe('getMember', () => {
    it('returns a member when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_member', content: JSON.stringify({ name: 'M', role: 'director', email: '', phone: '', expertise: '', committees: [], termStart: null, termEnd: null, status: 'active', bio: '', compensation: '' }) });
      const mem = await BoardService.getMember('mem-1');
      assert.ok(mem);
      assert.equal(mem!.name, 'M');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_meeting' });
      const mem = await BoardService.getMember('mem-1');
      assert.equal(mem, null);
    });
  });

  describe('listMembers', () => {
    it('lists members and filters by role and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'm1', type: 'board_member', content: JSON.stringify({ name: 'A', role: 'chair', email: '', phone: '', expertise: '', committees: [], termStart: null, termEnd: null, status: 'active', bio: '', compensation: '' }) }),
        makeRow({ id: 'm2', type: 'board_member', content: JSON.stringify({ name: 'B', role: 'director', email: '', phone: '', expertise: '', committees: [], termStart: null, termEnd: null, status: 'resigned', bio: '', compensation: '' }) }),
      ];
      const list = await BoardService.listMembers('org-1', { role: 'chair', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].role, 'chair');
    });
  });

  describe('deleteMember', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await BoardService.deleteMember('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Board Packs ──

  describe('createBoardPack', () => {
    it('creates a board pack with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'board_pack', content: args.data.content as string });
      const pack = await BoardService.createBoardPack('org-1', 'ws-1', { meetingId: 'm1', title: 'Q2 Pack', sections: [{ title: 's1', content: 'c1' }] }, 'user-1');
      assert.equal(pack.title, 'Q2 Pack');
      assert.equal(pack.meetingId, 'm1');
      assert.equal(pack.status, 'draft');
      assert.equal(pack.confidential, false);
      assert.equal(pack.sections.length, 1);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'board_pack', content: args.data.content as string });
      const pack = await BoardService.createBoardPack('org-1', 'ws-1', {
        meetingId: 'm1', title: 'Pack', sections: [{ title: 's', content: 'c', type: 'report', attachments: ['a.pdf'] }],
        status: 'review', distributedDate: '2024-06-01', distributedTo: ['alice'], confidential: true,
      }, 'user-1');
      assert.equal(pack.status, 'review');
      assert.equal(pack.confidential, true);
      assert.equal(pack.sections[0].type, 'report');
    });
  });

  describe('getBoardPack', () => {
    it('returns a board pack when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_pack', content: JSON.stringify({ meetingId: 'm1', title: 'P', sections: [], status: 'draft', distributedDate: null, distributedTo: [], distributedBy: null, confidential: false }) });
      const pack = await BoardService.getBoardPack('mem-1');
      assert.ok(pack);
      assert.equal(pack!.title, 'P');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_meeting' });
      const pack = await BoardService.getBoardPack('mem-1');
      assert.equal(pack, null);
    });
  });

  describe('listBoardPacks', () => {
    it('lists board packs and filters by meetingId and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'p1', type: 'board_pack', content: JSON.stringify({ meetingId: 'm1', title: 'A', sections: [], status: 'draft', distributedDate: null, distributedTo: [], distributedBy: null, confidential: false }) }),
        makeRow({ id: 'p2', type: 'board_pack', content: JSON.stringify({ meetingId: 'm2', title: 'B', sections: [], status: 'distributed', distributedDate: null, distributedTo: [], distributedBy: null, confidential: false }) }),
      ];
      const list = await BoardService.listBoardPacks('org-1', { meetingId: 'm1', status: 'draft' });
      assert.equal(list.length, 1);
      assert.equal(list[0].meetingId, 'm1');
    });
  });

  describe('distributeBoardPack', () => {
    it('distributes a board pack', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'board_pack', content: JSON.stringify({ meetingId: 'm1', title: 'P', sections: [], status: 'review', distributedDate: null, distributedTo: [], distributedBy: null, confidential: false }) });
      memUpdateImpl = async (args) => makeRow({ type: 'board_pack', content: args.data.content as string });
      const pack = await BoardService.distributeBoardPack('mem-1', 'user-1', ['alice', 'bob']);
      assert.ok(pack);
      assert.equal(pack!.status, 'distributed');
      assert.equal(pack!.distributedBy, 'user-1');
      assert.ok(pack!.distributedDate);
      assert.equal(pack!.distributedTo.length, 2);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const pack = await BoardService.distributeBoardPack('nope', 'u');
      assert.equal(pack, null);
    });
  });

  // ── Metrics & Stats ──

  describe('getBoardMetrics', () => {
    it('returns metrics with correct counts', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'board_meeting') return [
          makeRow({ id: 'm1', content: JSON.stringify({ title: 'A', date: '2024-06-01', location: '', type: 'regular', agenda: [], attendees: [], status: 'completed', minutes: '', actionItems: [], nextMeetingDate: null, cancelledReason: null, cancelledBy: null, minutesFinalizedBy: null }) }),
        ];
        if (where.type === 'board_resolution') return [
          makeRow({ id: 'r1', type: 'board_resolution', content: JSON.stringify({ title: 'R', description: '', type: 'ordinary', proposedBy: '', voteDeadline: null, status: 'passed', votes: [], outcome: '', attachments: [], finalizedBy: null }) }),
        ];
        if (where.type === 'board_committee') return [
          makeRow({ id: 'c1', type: 'board_committee', content: JSON.stringify({ name: 'C', type: 'audit', charter: '', members: [], chair: '', meetingFrequency: '', status: 'active', establishedDate: null }) }),
        ];
        if (where.type === 'board_pack') return [
          makeRow({ id: 'p1', type: 'board_pack', content: JSON.stringify({ meetingId: 'm1', title: 'P', sections: [], status: 'distributed', distributedDate: '2024-05-01', distributedTo: [], distributedBy: null, confidential: false }) }),
        ];
        return [];
      };
      const metrics = await BoardService.getBoardMetrics('org-1');
      assert.equal(metrics.meetingCount, 1);
      assert.equal(metrics.completedMeetingCount, 1);
      assert.equal(metrics.passedResolutions, 1);
      assert.equal(metrics.resolutionPassRate, 100);
      assert.equal(metrics.activeCommittees, 1);
      assert.equal(metrics.distributedBoardPackCount, 1);
    });
  });

  describe('getStats', () => {
    it('returns stats with correct counts', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'board_meeting') return [
          makeRow({ id: 'm1', content: JSON.stringify({ title: 'A', date: '2024-06-01', location: '', type: 'regular', agenda: [], attendees: [], status: 'scheduled', minutes: '', actionItems: [], nextMeetingDate: null, cancelledReason: null, cancelledBy: null, minutesFinalizedBy: null }) }),
        ];
        if (where.type === 'board_resolution') return [
          makeRow({ id: 'r1', type: 'board_resolution', content: JSON.stringify({ title: 'R', description: '', type: 'ordinary', proposedBy: '', voteDeadline: null, status: 'proposed', votes: [], outcome: '', attachments: [], finalizedBy: null }) }),
        ];
        if (where.type === 'board_committee') return [
          makeRow({ id: 'c1', type: 'board_committee', content: JSON.stringify({ name: 'C', type: 'audit', charter: '', members: [], chair: '', meetingFrequency: '', status: 'active', establishedDate: null }) }),
        ];
        if (where.type === 'board_member') return [
          makeRow({ id: 'mem1', type: 'board_member', content: JSON.stringify({ name: 'A', role: 'chair', email: '', phone: '', expertise: '', committees: [], termStart: null, termEnd: null, status: 'active', bio: '', compensation: '' }) }),
        ];
        return [];
      };
      const stats = await BoardService.getStats('org-1');
      assert.equal(stats.meetingCount, 1);
      assert.equal(stats.resolutionCount, 1);
      assert.equal(stats.committeeCount, 1);
      assert.equal(stats.memberCount, 1);
      assert.equal(stats.activeMemberCount, 1);
      assert.equal(stats.activeCommitteeCount, 1);
    });
  });
});
