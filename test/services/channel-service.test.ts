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
    createdAt?: Record<string, unknown>;
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

function makeRow(id: string, content: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'team_channel',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { ChannelService } = await import('@/lib/services/channel-service');

// ─────────────────────────────────────────────────────────────────────────────
// ChannelService
// ─────────────────────────────────────────────────────────────────────────────

describe('ChannelService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a channel with defaults (public type)', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'team_channel');
        const content = JSON.parse(args.data.content);
        assert.equal(content.type, 'public');
        assert.equal(content.name, 'general');
        assert.deepEqual(content.members, []);
        assert.deepEqual(content.pinnedMessages, []);
        return makeRow('ch-1', content);
      };

      const channel = await ChannelService.create('org-1', {
        name: 'general',
        createdBy: 'user-1',
      });

      assert.ok(channel);
      assert.equal(channel.id, 'ch-1');
      assert.equal(channel.name, 'general');
      assert.equal(channel.type, 'public');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates a private channel with members', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.type, 'private');
        assert.deepEqual(content.members, ['u1', 'u2']);
        return makeRow('ch-2', content);
      };

      const channel = await ChannelService.create('org-1', {
        name: 'private-chan',
        type: 'private',
        members: ['u1', 'u2'],
        createdBy: 'user-1',
      });

      assert.equal(channel.type, 'private');
      assert.deepEqual(channel.members, ['u1', 'u2']);
    });
  });

  describe('get', () => {
    it('returns a channel by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ch-1', { name: 'general', description: '', type: 'public', members: [], pinnedMessages: [], topic: '' });

      const channel = await ChannelService.get('ch-1');

      assert.ok(channel);
      assert.equal(channel.id, 'ch-1');
      assert.equal(channel.name, 'general');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when channel not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const channel = await ChannelService.get('nope');
      assert.equal(channel, null);
    });
  });

  describe('list', () => {
    it('returns channels for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('ch-1', { name: 'general', description: '', type: 'public', members: [], pinnedMessages: [], topic: '' }),
        makeRow('ch-2', { name: 'random', description: '', type: 'public', members: [], pinnedMessages: [], topic: '' }),
      ];

      const channels = await ChannelService.list('org-1');

      assert.equal(channels.length, 2);
      assert.equal(channels[0].id, 'ch-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by type', async () => {
      memoryFindManyImpl = async () => [
        makeRow('ch-1', { name: 'pub', description: '', type: 'public', members: [], pinnedMessages: [], topic: '' }),
        makeRow('ch-2', { name: 'priv', description: '', type: 'private', members: [], pinnedMessages: [], topic: '' }),
      ];

      const channels = await ChannelService.list('org-1', { type: 'private' });

      assert.equal(channels.length, 1);
      assert.equal(channels[0].type, 'private');
    });

    it('filters by memberId', async () => {
      memoryFindManyImpl = async () => [
        makeRow('ch-1', { name: 'a', description: '', type: 'public', members: ['u1'], pinnedMessages: [], topic: '' }),
        makeRow('ch-2', { name: 'b', description: '', type: 'public', members: ['u2'], pinnedMessages: [], topic: '' }),
      ];

      const channels = await ChannelService.list('org-1', { memberId: 'u1' });

      assert.equal(channels.length, 1);
      assert.equal(channels[0].members.includes('u1'), true);
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeRow('ch-1', { name: 'general', description: '', type: 'public', members: [], pinnedMessages: [], topic: '' }),
        makeRow('ch-2', { name: 'random', description: '', type: 'public', members: [], pinnedMessages: [], topic: '' }),
      ];

      const channels = await ChannelService.list('org-1', { search: 'gen' });

      assert.equal(channels.length, 1);
      assert.equal(channels[0].name, 'general');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const channels = await ChannelService.list('org-1');
      assert.deepEqual(channels, []);
    });
  });

  describe('update', () => {
    it('updates channel name, description, and topic', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ch-1', { name: 'old', description: 'old desc', type: 'public', members: [], pinnedMessages: [], topic: 'old topic' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'new');
        assert.equal(content.description, 'new desc');
        assert.equal(content.topic, 'new topic');
        return makeRow('ch-1', content);
      };

      const channel = await ChannelService.update('ch-1', {
        name: 'new',
        description: 'new desc',
        topic: 'new topic',
      });

      assert.ok(channel);
      assert.equal(channel.name, 'new');
      assert.equal(channel.topic, 'new topic');
    });

    it('returns null when channel not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const channel = await ChannelService.update('nope', { name: 'x' });
      assert.equal(channel, null);
    });
  });

  describe('delete', () => {
    it('deletes a channel', async () => {
      memoryDeleteImpl = async () => ({ id: 'ch-1' });

      const result = await ChannelService.delete('ch-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await ChannelService.delete('ch-1');
      assert.equal(result, false);
    });
  });

  describe('addMember', () => {
    it('adds a member to a channel', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ch-1', { name: 'general', description: '', type: 'public', members: ['u1'], pinnedMessages: [], topic: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.ok(content.members.includes('u2'));
        return makeRow('ch-1', content);
      };

      const channel = await ChannelService.addMember('ch-1', 'u2');

      assert.ok(channel);
      assert.ok(channel.members.includes('u2'));
    });

    it('does not add duplicate members', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ch-1', { name: 'general', description: '', type: 'public', members: ['u1'], pinnedMessages: [], topic: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.members.filter((m: string) => m === 'u1').length, 1);
        return makeRow('ch-1', content);
      };

      const channel = await ChannelService.addMember('ch-1', 'u1');
      assert.ok(channel);
      assert.equal(channel.members.filter((m) => m === 'u1').length, 1);
    });

    it('returns null when channel not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const channel = await ChannelService.addMember('nope', 'u1');
      assert.equal(channel, null);
    });
  });

  describe('removeMember', () => {
    it('removes a member from a channel', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ch-1', { name: 'general', description: '', type: 'public', members: ['u1', 'u2'], pinnedMessages: [], topic: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.ok(!content.members.includes('u2'));
        return makeRow('ch-1', content);
      };

      const channel = await ChannelService.removeMember('ch-1', 'u2');

      assert.ok(channel);
      assert.ok(!channel.members.includes('u2'));
    });
  });

  describe('getMembers', () => {
    it('returns the member list', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ch-1', { name: 'general', description: '', type: 'public', members: ['u1', 'u2'], pinnedMessages: [], topic: '' });

      const members = await ChannelService.getMembers('ch-1');
      assert.deepEqual(members, ['u1', 'u2']);
    });

    it('returns empty array when channel not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const members = await ChannelService.getMembers('nope');
      assert.deepEqual(members, []);
    });
  });

  describe('getDirectChannel', () => {
    it('finds an existing DM channel', async () => {
      memoryFindManyImpl = async () => [
        makeRow('dm-1', { name: 'DM:u1|u2', description: '', type: 'direct', members: ['u2', 'u1'], pinnedMessages: [], topic: '' }),
      ];

      const channel = await ChannelService.getDirectChannel('org-1', 'u1', 'u2');

      assert.equal(channel.id, 'dm-1');
      assert.equal(channel.type, 'direct');
    });

    it('creates a new DM channel when none exists', async () => {
      memoryFindManyImpl = async () => [];
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.type, 'direct');
        assert.ok(content.members.includes('u1'));
        assert.ok(content.members.includes('u2'));
        return makeRow('dm-new', content);
      };

      const channel = await ChannelService.getDirectChannel('org-1', 'u1', 'u2');

      assert.equal(channel.id, 'dm-new');
      assert.equal(channel.type, 'direct');
    });
  });

  describe('pinMessage', () => {
    it('pins a message', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ch-1', { name: 'general', description: '', type: 'public', members: [], pinnedMessages: [], topic: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.ok(content.pinnedMessages.includes('msg-1'));
        return makeRow('ch-1', content);
      };

      const channel = await ChannelService.pinMessage('ch-1', 'msg-1');

      assert.ok(channel);
      assert.ok(channel.pinnedMessages.includes('msg-1'));
    });

    it('does not pin duplicates', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ch-1', { name: 'general', description: '', type: 'public', members: [], pinnedMessages: ['msg-1'], topic: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.pinnedMessages.filter((m: string) => m === 'msg-1').length, 1);
        return makeRow('ch-1', content);
      };

      const channel = await ChannelService.pinMessage('ch-1', 'msg-1');
      assert.ok(channel);
      assert.equal(channel.pinnedMessages.filter((m) => m === 'msg-1').length, 1);
    });
  });

  describe('unpinMessage', () => {
    it('unpins a message', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ch-1', { name: 'general', description: '', type: 'public', members: [], pinnedMessages: ['msg-1', 'msg-2'], topic: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.ok(!content.pinnedMessages.includes('msg-1'));
        return makeRow('ch-1', content);
      };

      const channel = await ChannelService.unpinMessage('ch-1', 'msg-1');

      assert.ok(channel);
      assert.ok(!channel.pinnedMessages.includes('msg-1'));
    });
  });

  describe('getPinnedMessages', () => {
    it('returns pinned message IDs', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ch-1', { name: 'general', description: '', type: 'public', members: [], pinnedMessages: ['msg-1', 'msg-2'], topic: '' });

      const pinned = await ChannelService.getPinnedMessages('ch-1');
      assert.deepEqual(pinned, ['msg-1', 'msg-2']);
    });

    it('returns empty array when channel not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const pinned = await ChannelService.getPinnedMessages('nope');
      assert.deepEqual(pinned, []);
    });
  });

  describe('getStats', () => {
    it('aggregates channel stats by type', async () => {
      const now = new Date();
      memoryFindManyImpl = async () => [
        makeRow('ch-1', { name: 'a', description: '', type: 'public', members: ['u1', 'u2'], pinnedMessages: [], topic: '' }, { updatedAt: now }),
        makeRow('ch-2', { name: 'b', description: '', type: 'private', members: ['u1'], pinnedMessages: [], topic: '' }, { updatedAt: now }),
        makeRow('ch-3', { name: 'c', description: '', type: 'direct', members: ['u1', 'u3'], pinnedMessages: [], topic: '' }, { updatedAt: new Date('2020-01-01') }),
      ];

      const stats = await ChannelService.getStats('org-1');

      assert.equal(stats.totalChannels, 3);
      assert.equal(stats.byType.public, 1);
      assert.equal(stats.byType.private, 1);
      assert.equal(stats.byType.direct, 1);
      assert.equal(stats.totalMembers, 5);
      assert.equal(stats.activeChannels, 2); // ch-3 is old
    });

    it('returns zero stats when no channels', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await ChannelService.getStats('org-1');

      assert.equal(stats.totalChannels, 0);
      assert.equal(stats.byType.public, 0);
      assert.equal(stats.activeChannels, 0);
    });

    it('returns zero stats on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await ChannelService.getStats('org-1');
      assert.equal(stats.totalChannels, 0);
    });
  });
});
