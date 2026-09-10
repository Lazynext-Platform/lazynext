import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: {
    type?: string;
    organizationId?: string;
    workspaceId?: string;
    sourceId?: string;
    createdBy?: string;
  };
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
};

type MemoryFindUniqueArgs = {
  where: { id: string };
};

type MemoryFindFirstArgs = {
  where: Record<string, unknown>;
};

type MemoryCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    type: string;
    content: string;
    source: string;
    sourceId: string | null;
    confidence: number;
    lifecycle: string;
    tags: string;
    createdBy: string;
  };
};

type MemoryUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type MemoryDeleteArgs = {
  where: { id: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> =
  async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> =
  async () => null;
let memoryFindFirstImpl: (args: MemoryFindFirstArgs) => Promise<unknown> =
  async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> =
  async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> =
  async () => ({});
let memoryDeleteImpl: (args: MemoryDeleteArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    findFirst: (args: MemoryFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: MemoryDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
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
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
}

function makeMessageRow(id: string, orgId: string = 'org-1'): unknown {
  return {
    id,
    workspaceId: orgId,
    organizationId: orgId,
    type: 'team_message',
    content: JSON.stringify({ body: 'test', userId: 'u1', attachments: [], replyTo: null, mentions: [], edited: false }),
    sourceId: 'ch-1',
    createdBy: 'u1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };
}

function makeFlagRow(id: string, content: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'moderation_flag',
    content: JSON.stringify(content),
    sourceId: `message:${content.messageId}`,
    createdBy: content.flaggedBy,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeMuteRow(id: string, userId: string, content: Record<string, unknown>): unknown {
  return {
    id,
    workspaceId: 'org-1',
    organizationId: 'org-1',
    type: 'moderation_mute',
    content: JSON.stringify(content),
    sourceId: `user:${userId}`,
    createdBy: content.mutedBy,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };
}

function makeLogRow(id: string, content: Record<string, unknown>): unknown {
  return {
    id,
    workspaceId: 'org-1',
    organizationId: 'org-1',
    type: 'moderation_log',
    content: JSON.stringify(content),
    sourceId: content.targetId,
    createdBy: content.actorId,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };
}

const { ModerationService } = await import('@/lib/services/moderation-service');

// ─────────────────────────────────────────────────────────────────────────────
// ModerationService
// ─────────────────────────────────────────────────────────────────────────────

describe('ModerationService', () => {
  beforeEach(() => { resetMock(); });

  describe('flagMessage', () => {
    it('flags a message for moderation', async () => {
      memoryFindUniqueImpl = async () => makeMessageRow('msg-1');
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'moderation_flag');
        assert.equal(args.data.sourceId, 'message:msg-1');
        const content = JSON.parse(args.data.content);
        assert.equal(content.messageId, 'msg-1');
        assert.equal(content.flaggedBy, 'user-2');
        assert.equal(content.reason, 'spam');
        assert.equal(content.status, 'pending');
        assert.equal(content.severity, 'high');
        return makeFlagRow('flag-1', content);
      };

      const flag = await ModerationService.flagMessage('msg-1', 'user-2', 'spam', 'high');

      assert.ok(flag);
      assert.equal(flag.messageId, 'msg-1');
      assert.equal(flag.reason, 'spam');
      assert.equal(flag.status, 'pending');
      assert.equal(flag.severity, 'high');
    });

    it('defaults severity to medium', async () => {
      memoryFindUniqueImpl = async () => makeMessageRow('msg-1');
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.severity, 'medium');
        return makeFlagRow('flag-1', content);
      };

      const flag = await ModerationService.flagMessage('msg-1', 'user-2', 'inappropriate');
      assert.equal(flag.severity, 'medium');
    });
  });

  describe('getFlags', () => {
    it('returns flags for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeFlagRow('flag-1', { messageId: 'msg-1', flaggedBy: 'u1', reason: 'spam', status: 'pending', severity: 'medium', resolvedBy: null, resolvedAt: null, action: null }),
        makeFlagRow('flag-2', { messageId: 'msg-2', flaggedBy: 'u2', reason: 'abuse', status: 'resolved', severity: 'high', resolvedBy: 'u3', resolvedAt: '2025-01-02', action: 'removed' }),
      ];

      const flags = await ModerationService.getFlags('org-1');

      assert.equal(flags.length, 2);
      assert.equal(flags[0].id, 'flag-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeFlagRow('flag-1', { messageId: 'msg-1', flaggedBy: 'u1', reason: 'spam', status: 'pending', severity: 'medium', resolvedBy: null, resolvedAt: null, action: null }),
        makeFlagRow('flag-2', { messageId: 'msg-2', flaggedBy: 'u2', reason: 'abuse', status: 'resolved', severity: 'high', resolvedBy: 'u3', resolvedAt: '2025-01-02', action: 'removed' }),
      ];

      const flags = await ModerationService.getFlags('org-1', { status: 'pending' });

      assert.equal(flags.length, 1);
      assert.equal(flags[0].status, 'pending');
    });

    it('filters by severity', async () => {
      memoryFindManyImpl = async () => [
        makeFlagRow('flag-1', { messageId: 'msg-1', flaggedBy: 'u1', reason: 'spam', status: 'pending', severity: 'low', resolvedBy: null, resolvedAt: null, action: null }),
        makeFlagRow('flag-2', { messageId: 'msg-2', flaggedBy: 'u2', reason: 'abuse', status: 'pending', severity: 'high', resolvedBy: null, resolvedAt: null, action: null }),
      ];

      const flags = await ModerationService.getFlags('org-1', { severity: 'high' });

      assert.equal(flags.length, 1);
      assert.equal(flags[0].severity, 'high');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const flags = await ModerationService.getFlags('org-1');
      assert.deepEqual(flags, []);
    });
  });

  describe('resolveFlag', () => {
    it('resolves a flag with an action', async () => {
      memoryFindUniqueImpl = async () =>
        makeFlagRow('flag-1', { messageId: 'msg-1', flaggedBy: 'u1', reason: 'spam', status: 'pending', severity: 'medium', resolvedBy: null, resolvedAt: null, action: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'resolved');
        assert.equal(content.resolvedBy, 'admin-1');
        assert.equal(content.action, 'removed');
        assert.ok(content.resolvedAt);
        return makeFlagRow('flag-1', content);
      };
      // _log will call create via safePrisma
      memoryCreateImpl = async () => makeLogRow('log-1', { action: 'flag_resolved', targetId: 'flag-1', actorId: 'admin-1', reason: 'Flag resolved with action: removed', metadata: {} });

      const flag = await ModerationService.resolveFlag('flag-1', 'admin-1', 'removed');

      assert.ok(flag);
      assert.equal(flag.status, 'resolved');
      assert.equal(flag.action, 'removed');
      assert.equal(flag.resolvedBy, 'admin-1');
    });

    it('returns null when flag not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const flag = await ModerationService.resolveFlag('nope', 'admin-1', 'approved');
      assert.equal(flag, null);
    });
  });

  describe('deleteMessage', () => {
    it('deletes a message and creates an audit log entry', async () => {
      memoryFindUniqueImpl = async () => makeMessageRow('msg-1');
      memoryDeleteImpl = async () => ({ id: 'msg-1' });
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'moderation_log');
        const content = JSON.parse(args.data.content);
        assert.equal(content.action, 'message_deleted');
        assert.equal(content.targetId, 'msg-1');
        return makeLogRow('log-1', content);
      };

      const result = await ModerationService.deleteMessage('msg-1', 'admin-1', 'violation');

      assert.equal(result, true);
    });

    it('returns false when message not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await ModerationService.deleteMessage('nope', 'admin-1', 'x');
      assert.equal(result, false);
    });
  });

  describe('muteUser', () => {
    it('mutes a user with duration', async () => {
      memoryFindFirstImpl = async () => null;
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'moderation_mute');
        assert.equal(args.data.sourceId, 'user:u1');
        const content = JSON.parse(args.data.content);
        assert.equal(content.userId, 'u1');
        assert.equal(content.mutedBy, 'admin-1');
        assert.equal(content.active, true);
        assert.ok(content.expiresAt);
        return makeMuteRow('mute-1', 'u1', content);
      };

      const mute = await ModerationService.muteUser('u1', 'admin-1', 30, 'spamming');

      assert.ok(mute);
      assert.equal(mute.userId, 'u1');
      assert.equal(mute.active, true);
      assert.ok(mute.expiresAt);
    });

    it('mutes a user permanently (no duration)', async () => {
      memoryFindFirstImpl = async () => null;
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.expiresAt, null);
        return makeMuteRow('mute-1', 'u1', content);
      };

      const mute = await ModerationService.muteUser('u1', 'admin-1', undefined, 'banned');

      assert.ok(mute);
      assert.equal(mute.expiresAt, null);
    });
  });

  describe('unmuteUser', () => {
    it('unmutes a user by marking all active mutes inactive', async () => {
      memoryFindManyImpl = async () => [
        makeMuteRow('mute-1', 'u1', { userId: 'u1', mutedBy: 'admin-1', reason: 'spam', expiresAt: null, active: true }),
      ];
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.active, false);
        return makeMuteRow('mute-1', 'u1', content);
      };

      const result = await ModerationService.unmuteUser('u1');
      assert.equal(result, true);
    });

    it('returns false when no mutes found', async () => {
      memoryFindManyImpl = async () => [];

      const result = await ModerationService.unmuteUser('u1');
      assert.equal(result, false);
    });
  });

  describe('isMuted', () => {
    it('returns true for active permanent mute', async () => {
      memoryFindManyImpl = async () => [
        makeMuteRow('mute-1', 'u1', { userId: 'u1', mutedBy: 'admin-1', reason: 'spam', expiresAt: null, active: true }),
      ];

      const muted = await ModerationService.isMuted('u1');
      assert.equal(muted, true);
    });

    it('returns true for active time-limited mute that has not expired', async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      memoryFindManyImpl = async () => [
        makeMuteRow('mute-1', 'u1', { userId: 'u1', mutedBy: 'admin-1', reason: 'spam', expiresAt: future, active: true }),
      ];

      const muted = await ModerationService.isMuted('u1');
      assert.equal(muted, true);
    });

    it('returns false for expired mute', async () => {
      const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      memoryFindManyImpl = async () => [
        makeMuteRow('mute-1', 'u1', { userId: 'u1', mutedBy: 'admin-1', reason: 'spam', expiresAt: past, active: true }),
      ];

      const muted = await ModerationService.isMuted('u1');
      assert.equal(muted, false);
    });

    it('returns false for inactive mute', async () => {
      memoryFindManyImpl = async () => [
        makeMuteRow('mute-1', 'u1', { userId: 'u1', mutedBy: 'admin-1', reason: 'spam', expiresAt: null, active: false }),
      ];

      const muted = await ModerationService.isMuted('u1');
      assert.equal(muted, false);
    });

    it('returns false when no mutes exist', async () => {
      memoryFindManyImpl = async () => [];

      const muted = await ModerationService.isMuted('u1');
      assert.equal(muted, false);
    });
  });

  describe('getModerationLog', () => {
    it('returns moderation log entries', async () => {
      memoryFindManyImpl = async () => [
        makeLogRow('log-1', { action: 'message_deleted', targetId: 'msg-1', actorId: 'admin-1', reason: 'spam', metadata: {} }),
        makeLogRow('log-2', { action: 'user_muted', targetId: 'u1', actorId: 'admin-1', reason: 'abuse', metadata: {} }),
      ];

      const log = await ModerationService.getModerationLog('org-1');

      assert.equal(log.length, 2);
      assert.equal(log[0].action, 'message_deleted');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by action', async () => {
      memoryFindManyImpl = async () => [
        makeLogRow('log-1', { action: 'message_deleted', targetId: 'msg-1', actorId: 'admin-1', reason: 'spam', metadata: {} }),
        makeLogRow('log-2', { action: 'user_muted', targetId: 'u1', actorId: 'admin-1', reason: 'abuse', metadata: {} }),
      ];

      const log = await ModerationService.getModerationLog('org-1', { action: 'message_deleted' });

      assert.equal(log.length, 1);
      assert.equal(log[0].action, 'message_deleted');
    });
  });

  describe('getStats', () => {
    it('aggregates moderation stats', async () => {
      // First call: flags
      // Second call: logs
      // Third call: mutes
      let callCount = 0;
      memoryFindManyImpl = async () => {
        callCount++;
        if (callCount === 1) {
          // flags
          return [
            makeFlagRow('flag-1', { messageId: 'msg-1', flaggedBy: 'u1', reason: 'spam', status: 'pending', severity: 'medium', resolvedBy: null, resolvedAt: null, action: null }),
            makeFlagRow('flag-2', { messageId: 'msg-2', flaggedBy: 'u2', reason: 'abuse', status: 'resolved', severity: 'high', resolvedBy: 'u3', resolvedAt: '2025-01-02', action: 'removed' }),
          ];
        }
        if (callCount === 2) {
          // logs
          return [
            makeLogRow('log-1', { action: 'message_deleted', targetId: 'msg-1', actorId: 'admin-1', reason: 'spam', metadata: {} }),
            makeLogRow('log-2', { action: 'message_deleted', targetId: 'msg-2', actorId: 'admin-1', reason: 'abuse', metadata: {} }),
            makeLogRow('log-3', { action: 'user_muted', targetId: 'u1', actorId: 'admin-1', reason: 'spam', metadata: {} }),
          ];
        }
        // mutes
        return [
          makeMuteRow('mute-1', 'u1', { userId: 'u1', mutedBy: 'admin-1', reason: 'spam', expiresAt: null, active: true }),
        ];
      };

      const stats = await ModerationService.getStats('org-1');

      assert.equal(stats.totalFlags, 2);
      assert.equal(stats.resolvedFlags, 1);
      assert.equal(stats.pendingFlags, 1);
      assert.equal(stats.deletedMessages, 2);
      assert.equal(stats.mutedUsers, 1);
    });

    it('returns zero stats when no data', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await ModerationService.getStats('org-1');

      assert.equal(stats.totalFlags, 0);
      assert.equal(stats.resolvedFlags, 0);
      assert.equal(stats.pendingFlags, 0);
      assert.equal(stats.deletedMessages, 0);
      assert.equal(stats.mutedUsers, 0);
    });
  });
});
