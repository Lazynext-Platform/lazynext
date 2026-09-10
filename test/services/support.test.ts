import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type TicketFindManyArgs = {
  where: {
    workspaceId?: string;
    status?: string | { notIn?: string[] };
    priority?: string;
    assigneeId?: string;
    customerId?: string;
    slaDueAt?: { lt?: Date };
  };
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type TicketFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
};

type TicketCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string;
    customerId?: string | null;
    subject: string;
    description: string;
    status?: string;
    priority: string;
    category: string;
    channel: string;
    assigneeId?: string | null;
    reporterId?: string | null;
    slaDueAt?: Date | null;
    tags: string;
  };
};

type TicketUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type CommentFindManyArgs = {
  where: { ticketId: string };
  orderBy?: Record<string, unknown>;
  take?: number;
};

type CommentCreateArgs = {
  data: {
    ticketId: string;
    authorId?: string | null;
    authorType: string;
    body: string;
    isInternal: boolean;
  };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let ticketFindManyImpl: (args: TicketFindManyArgs) => Promise<unknown[]> =
  async () => [];
let ticketFindUniqueImpl: (args: TicketFindUniqueArgs) => Promise<unknown> =
  async () => null;
let ticketCreateImpl: (args: TicketCreateArgs) => Promise<unknown> =
  async () => ({});
let ticketUpdateImpl: (args: TicketUpdateArgs) => Promise<unknown> =
  async () => ({});
let commentFindManyImpl: (args: CommentFindManyArgs) => Promise<unknown[]> =
  async () => [];
let commentCreateImpl: (args: CommentCreateArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  ticket: {
    findMany: (args: TicketFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'ticket.findMany', args });
      return ticketFindManyImpl(args);
    },
    findUnique: (args: TicketFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'ticket.findUnique', args });
      return ticketFindUniqueImpl(args);
    },
    create: (args: TicketCreateArgs): Promise<unknown> => {
      calls.push({ method: 'ticket.create', args });
      return ticketCreateImpl(args);
    },
    update: (args: TicketUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'ticket.update', args });
      return ticketUpdateImpl(args);
    },
  },
  ticketComment: {
    findMany: (args: CommentFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'ticketComment.findMany', args });
      return commentFindManyImpl(args);
    },
    create: (args: CommentCreateArgs): Promise<unknown> => {
      calls.push({ method: 'ticketComment.create', args });
      return commentCreateImpl(args);
    },
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
  ticketFindManyImpl = async () => [];
  ticketFindUniqueImpl = async () => null;
  ticketCreateImpl = async () => ({});
  ticketUpdateImpl = async () => ({});
  commentFindManyImpl = async () => [];
  commentCreateImpl = async () => ({});
}

const { SupportService } = await import('@/lib/services/support');

// ─────────────────────────────────────────────────────────────────────────────
// SupportService
// ─────────────────────────────────────────────────────────────────────────────

describe('SupportService', () => {
  beforeEach(() => { resetMock(); });

  describe('listTickets', () => {
    it('returns tickets for a workspace', async () => {
      ticketFindManyImpl = async () =>
        ([{ id: 't1', subject: 'Broken login', _count: { comments: 2 } }]);

      const result = await SupportService.listTickets('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 't1');
      assert.equal(calls[0].method, 'ticket.findMany');
      const args = calls[0].args as TicketFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('applies status, priority, assigneeId, and customerId filters', async () => {
      ticketFindManyImpl = async () => [];

      await SupportService.listTickets('ws-1', {
        status: 'open',
        priority: 'high',
        assigneeId: 'u1',
        customerId: 'c1',
      });

      const args = calls[0].args as TicketFindManyArgs;
      assert.equal(args.where.status, 'open');
      assert.equal(args.where.priority, 'high');
      assert.equal(args.where.assigneeId, 'u1');
      assert.equal(args.where.customerId, 'c1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      ticketFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await SupportService.listTickets('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getTicket', () => {
    it('returns a ticket by id with comments', async () => {
      ticketFindUniqueImpl = async () =>
        ({ id: 't1', subject: 'Issue', comments: [{ id: 'cm1' }] });

      const result = await SupportService.getTicket('t1');

      assert.ok(result);
      assert.equal(result.id, 't1');
      assert.equal(calls[0].method, 'ticket.findUnique');
    });

    it('returns null when ticket not found', async () => {
      ticketFindUniqueImpl = async () => null;

      const result = await SupportService.getTicket('nope');
      assert.equal(result, null);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      ticketFindUniqueImpl = async () => { throw new Error('fail'); };

      const result = await SupportService.getTicket('t1');
      assert.equal(result, null);
    });
  });

  describe('createTicket', () => {
    it('creates a ticket with defaults', async () => {
      ticketCreateImpl = async (args: TicketCreateArgs) => {
        assert.equal(args.data.priority, 'medium');
        assert.equal(args.data.category, 'general');
        assert.equal(args.data.channel, 'internal');
        assert.equal(args.data.slaDueAt, null);
        return { id: 't1', ...args.data };
      };

      const result = await SupportService.createTicket('ws-1', {
        organizationId: 'org-1',
        subject: 'New issue',
        description: 'Something is broken',
      });

      assert.ok(result);
      assert.equal(result.id, 't1');
      assert.equal(calls[0].method, 'ticket.create');
    });

    it('calculates slaDueAt from slaHours', async () => {
      ticketCreateImpl = async (args: TicketCreateArgs) => {
        assert.ok(args.data.slaDueAt instanceof Date);
        // slaDueAt should be ~24h from now
        const now = Date.now();
        const due = args.data.slaDueAt!.getTime();
        const diffHours = (due - now) / (1000 * 60 * 60);
        assert.ok(diffHours > 23 && diffHours < 25);
        return { id: 't1', slaDueAt: args.data.slaDueAt };
      };

      await SupportService.createTicket('ws-1', {
        organizationId: 'org-1',
        subject: 'SLA ticket',
        description: 'Has SLA',
        slaHours: 24,
      });
    });

    it('truncates long subjects to 300 characters', async () => {
      ticketCreateImpl = async (args: TicketCreateArgs) => {
        assert.ok(args.data.subject.length <= 300);
        return { id: 't1', subject: args.data.subject };
      };

      await SupportService.createTicket('ws-1', {
        organizationId: 'org-1',
        subject: 'A'.repeat(500),
        description: 'desc',
      });
    });

    it('serializes tags as JSON array string', async () => {
      ticketCreateImpl = async (args: TicketCreateArgs) => {
        assert.equal(args.data.tags, JSON.stringify(['urgent', 'vip']));
        return { id: 't1', tags: args.data.tags };
      };

      await SupportService.createTicket('ws-1', {
        organizationId: 'org-1',
        subject: 'Tagged',
        description: 'desc',
        tags: ['urgent', 'vip'],
      });
    });
  });

  describe('updateTicket', () => {
    it('updates only provided fields', async () => {
      ticketUpdateImpl = async (args: TicketUpdateArgs) => {
        assert.equal(args.data.subject, 'Updated');
        assert.equal(args.data.priority, undefined);
        return { id: 't1', ...args.data };
      };

      const result = await SupportService.updateTicket('t1', { subject: 'Updated' });
      assert.ok(result);
      assert.equal(calls[0].method, 'ticket.update');
    });
  });

  describe('addComment', () => {
    it('creates a comment with defaults', async () => {
      commentCreateImpl = async (args: CommentCreateArgs) => {
        assert.equal(args.data.authorType, 'agent');
        assert.equal(args.data.isInternal, false);
        assert.equal(args.data.body, 'Hello world');
        return { id: 'cm1', ...args.data };
      };

      const result = await SupportService.addComment('t1', {
        authorType: 'agent',
        body: 'Hello world',
      });

      assert.ok(result);
      assert.equal(result.id, 'cm1');
      assert.equal(calls[0].method, 'ticketComment.create');
    });

    it('respects isInternal flag', async () => {
      commentCreateImpl = async (args: CommentCreateArgs) => {
        assert.equal(args.data.isInternal, true);
        return { id: 'cm1', isInternal: true };
      };

      await SupportService.addComment('t1', {
        authorType: 'agent',
        body: 'Internal note',
        isInternal: true,
      });
    });
  });

  describe('listComments', () => {
    it('returns comments for a ticket', async () => {
      commentFindManyImpl = async () =>
        ([{ id: 'cm1', body: 'First' }, { id: 'cm2', body: 'Second' }]);

      const result = await SupportService.listComments('t1');

      assert.equal(result.length, 2);
      assert.equal(result[0].id, 'cm1');
      assert.equal(calls[0].method, 'ticketComment.findMany');
      const args = calls[0].args as CommentFindManyArgs;
      assert.equal(args.where.ticketId, 't1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      commentFindManyImpl = async () => { throw new Error('fail'); };

      const result = await SupportService.listComments('t1');
      assert.deepEqual(result, []);
    });
  });

  describe('assignTicket', () => {
    it('assigns a ticket to a user', async () => {
      ticketUpdateImpl = async (args: TicketUpdateArgs) => {
        assert.equal(args.data.assigneeId, 'u1');
        return { id: 't1', assigneeId: 'u1' };
      };

      const result = await SupportService.assignTicket('t1', 'u1');
      assert.ok(result);
      assert.equal(calls[0].method, 'ticket.update');
    });
  });

  describe('changeStatus', () => {
    it('sets resolvedAt when status is resolved', async () => {
      ticketUpdateImpl = async (args: TicketUpdateArgs) => {
        assert.equal(args.data.status, 'resolved');
        assert.ok(args.data.resolvedAt instanceof Date);
        return { id: 't1', status: 'resolved' };
      };

      const result = await SupportService.changeStatus('t1', 'resolved');
      assert.ok(result);
    });

    it('sets closedAt when status is closed', async () => {
      ticketUpdateImpl = async (args: TicketUpdateArgs) => {
        assert.equal(args.data.status, 'closed');
        assert.ok(args.data.closedAt instanceof Date);
        return { id: 't1', status: 'closed' };
      };

      await SupportService.changeStatus('t1', 'closed');
    });

    it('sets firstResponseAt when status is in_progress and not already set', async () => {
      ticketFindUniqueImpl = async () => ({ firstResponseAt: null });
      ticketUpdateImpl = async (args: TicketUpdateArgs) => {
        assert.equal(args.data.status, 'in_progress');
        assert.ok(args.data.firstResponseAt instanceof Date);
        return { id: 't1', status: 'in_progress' };
      };

      await SupportService.changeStatus('t1', 'in_progress');
      // findUnique called to check firstResponseAt
      assert.equal(calls[0].method, 'ticket.findUnique');
      assert.equal(calls[1].method, 'ticket.update');
    });

    it('does not set firstResponseAt when already set', async () => {
      ticketFindUniqueImpl = async () => ({ firstResponseAt: new Date('2024-01-01') });
      ticketUpdateImpl = async (args: TicketUpdateArgs) => {
        assert.equal(args.data.status, 'in_progress');
        assert.equal(args.data.firstResponseAt, undefined);
        return { id: 't1', status: 'in_progress' };
      };

      await SupportService.changeStatus('t1', 'in_progress');
    });
  });

  describe('escalate', () => {
    it('sets priority to urgent and status to escalated', async () => {
      ticketUpdateImpl = async (args: TicketUpdateArgs) => {
        assert.equal(args.data.priority, 'urgent');
        assert.equal(args.data.status, 'escalated');
        return { id: 't1', priority: 'urgent', status: 'escalated' };
      };

      const result = await SupportService.escalate('t1');
      assert.ok(result);
      assert.equal(calls[0].method, 'ticket.update');
    });
  });

  describe('deleteTicket', () => {
    it('soft deletes by setting status to closed and closedAt', async () => {
      ticketUpdateImpl = async (args: TicketUpdateArgs) => {
        assert.equal(args.data.status, 'closed');
        assert.ok(args.data.closedAt instanceof Date);
        return { id: 't1', status: 'closed' };
      };

      const result = await SupportService.deleteTicket('t1');
      assert.ok(result);
      assert.equal(calls[0].method, 'ticket.update');
    });
  });

  describe('getStats', () => {
    it('aggregates ticket counts by status, priority, and category', async () => {
      ticketFindManyImpl = async () => ([
        { status: 'open', priority: 'high', category: 'technical', slaDueAt: null, resolvedAt: null, createdAt: new Date() },
        { status: 'open', priority: 'medium', category: 'billing', slaDueAt: null, resolvedAt: null, createdAt: new Date() },
        { status: 'resolved', priority: 'low', category: 'general', slaDueAt: new Date('2024-12-31'), resolvedAt: new Date('2024-06-01'), createdAt: new Date('2024-05-01') },
      ]);

      const stats = await SupportService.getStats('ws-1');

      assert.equal(stats.total, 3);
      assert.equal(stats.byStatus.open, 2);
      assert.equal(stats.byStatus.resolved, 1);
      assert.equal(stats.byPriority.high, 1);
      assert.equal(stats.byPriority.medium, 1);
      assert.equal(stats.byPriority.low, 1);
      assert.equal(stats.byCategory.technical, 1);
      assert.equal(stats.byCategory.billing, 1);
      assert.equal(stats.byCategory.general, 1);
      assert.equal(stats.open, 2);
      assert.equal(stats.resolved, 1);
    });

    it('calculates SLA compliance rate (resolved before slaDueAt)', async () => {
      const slaDue = new Date('2024-12-31');
      ticketFindManyImpl = async () => ([
        // resolved before SLA — compliant
        { status: 'resolved', priority: 'low', category: 'general', slaDueAt: slaDue, resolvedAt: new Date('2024-06-01'), createdAt: new Date('2024-05-01') },
        // resolved after SLA — not compliant
        { status: 'closed', priority: 'low', category: 'general', slaDueAt: new Date('2024-01-01'), resolvedAt: new Date('2024-06-01'), createdAt: new Date('2023-12-01') },
      ]);

      const stats = await SupportService.getStats('ws-1');

      assert.equal(stats.resolved, 2);
      assert.equal(stats.slaComplianceRate, 0.5);
    });

    it('returns zero stats when no tickets', async () => {
      ticketFindManyImpl = async () => [];

      const stats = await SupportService.getStats('ws-1');

      assert.equal(stats.total, 0);
      assert.equal(stats.open, 0);
      assert.equal(stats.resolved, 0);
      assert.equal(stats.slaComplianceRate, 0);
    });

    it('returns empty stats on error (safePrisma fallback)', async () => {
      ticketFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await SupportService.getStats('ws-1');
      assert.equal(stats.total, 0);
      assert.equal(stats.open, 0);
    });
  });

  describe('getSlaStatus', () => {
    it('returns tickets with SLA due before now and not resolved/closed', async () => {
      ticketFindManyImpl = async () =>
        ([{ id: 't1', subject: 'Breached', slaDueAt: new Date('2024-01-01') }]);

      const result = await SupportService.getSlaStatus('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 't1');
      assert.equal(calls[0].method, 'ticket.findMany');
      const args = calls[0].args as TicketFindManyArgs;
      assert.ok(args.where.slaDueAt?.lt instanceof Date);
      const statusFilter = args.where.status as { notIn?: string[] };
      assert.deepEqual(statusFilter.notIn, ['resolved', 'closed']);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      ticketFindManyImpl = async () => { throw new Error('fail'); };

      const result = await SupportService.getSlaStatus('ws-1');
      assert.deepEqual(result, []);
    });
  });
});
