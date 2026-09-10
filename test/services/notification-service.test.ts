import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type NotificationCreateArgs = {
  data: {
    userId: string;
    workspaceId: string | null;
    type: string;
    title: string;
    body: string;
  };
};

type NotificationFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
  select?: Record<string, unknown>;
};

type NotificationFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};

type NotificationUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type NotificationUpdateManyArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

type NotificationCountArgs = {
  where: Record<string, unknown>;
};

type NotificationDeleteArgs = {
  where: { id: string };
};

type UserFindUniqueArgs = {
  where: { id?: string; email?: string };
  select?: Record<string, unknown>;
};

type UserFindFirstArgs = {
  where: { name?: string };
  select?: Record<string, unknown>;
};

type UserUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type MembershipFindManyArgs = {
  where: { workspaceId?: string | { in: string[] } };
  select?: Record<string, unknown>;
  distinct?: string[];
};

type WorkspaceFindManyArgs = {
  where: { organizationId?: string };
  select?: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let notificationCreateImpl: (args: NotificationCreateArgs) => Promise<unknown> =
  async () => ({});
let notificationFindManyImpl: (args: NotificationFindManyArgs) => Promise<unknown[]> =
  async () => [];
let notificationFindUniqueImpl: (args: NotificationFindUniqueArgs) => Promise<unknown> =
  async () => null;
let notificationCountImpl: (args: NotificationCountArgs) => Promise<number> =
  async () => 0;
let notificationUpdateImpl: (args: NotificationUpdateArgs) => Promise<unknown> =
  async () => ({});
let notificationUpdateManyImpl: (args: NotificationUpdateManyArgs) => Promise<{ count: number }> =
  async () => ({ count: 0 });
let notificationDeleteImpl: (args: NotificationDeleteArgs) => Promise<unknown> =
  async () => ({});

let userFindUniqueImpl: (args: UserFindUniqueArgs) => Promise<unknown> =
  async () => null;
let userFindFirstImpl: (args: UserFindFirstArgs) => Promise<unknown> =
  async () => null;
let userUpdateImpl: (args: UserUpdateArgs) => Promise<unknown> =
  async () => ({});

let membershipFindManyImpl: (args: MembershipFindManyArgs) => Promise<unknown[]> =
  async () => [];
let workspaceFindManyImpl: (args: WorkspaceFindManyArgs) => Promise<unknown[]> =
  async () => [];

const prismaMock = {
  notification: {
    create: (args: NotificationCreateArgs): Promise<unknown> => {
      calls.push({ method: 'notification.create', args });
      return notificationCreateImpl(args);
    },
    findMany: (args: NotificationFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'notification.findMany', args });
      return notificationFindManyImpl(args);
    },
    findUnique: (args: NotificationFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'notification.findUnique', args });
      return notificationFindUniqueImpl(args);
    },
    count: (args: NotificationCountArgs): Promise<number> => {
      calls.push({ method: 'notification.count', args });
      return notificationCountImpl(args);
    },
    update: (args: NotificationUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'notification.update', args });
      return notificationUpdateImpl(args);
    },
    updateMany: (args: NotificationUpdateManyArgs): Promise<{ count: number }> => {
      calls.push({ method: 'notification.updateMany', args });
      return notificationUpdateManyImpl(args);
    },
    delete: (args: NotificationDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'notification.delete', args });
      return notificationDeleteImpl(args);
    },
  },
  user: {
    findUnique: (args: UserFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'user.findUnique', args });
      return userFindUniqueImpl(args);
    },
    findFirst: (args: UserFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'user.findFirst', args });
      return userFindFirstImpl(args);
    },
    update: (args: UserUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'user.update', args });
      return userUpdateImpl(args);
    },
  },
  membership: {
    findMany: (args: MembershipFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'membership.findMany', args });
      return membershipFindManyImpl(args);
    },
  },
  workspace: {
    findMany: (args: WorkspaceFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'workspace.findMany', args });
      return workspaceFindManyImpl(args);
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

mock.module('@/lib/email', {
  namedExports: {
    sendNotificationEmail: async (): Promise<{ sent: boolean }> => {
      calls.push({ method: 'sendNotificationEmail' });
      return { sent: true };
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  notificationCreateImpl = async () => ({});
  notificationFindManyImpl = async () => [];
  notificationFindUniqueImpl = async () => null;
  notificationCountImpl = async () => 0;
  notificationUpdateImpl = async () => ({});
  notificationUpdateManyImpl = async () => ({ count: 0 });
  notificationDeleteImpl = async () => ({});
  userFindUniqueImpl = async () => null;
  userFindFirstImpl = async () => null;
  userUpdateImpl = async () => ({});
  membershipFindManyImpl = async () => [];
  workspaceFindManyImpl = async () => [];
}

const { NotificationService } = await import('@/lib/services/notification-service');

// ─────────────────────────────────────────────────────────────────────────────
// NotificationService
// ─────────────────────────────────────────────────────────────────────────────

describe('NotificationService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a notification with an envelope in the body', async () => {
      // Default prefs: user has no stored prefs → getDefaultPreferences()
      userFindUniqueImpl = async (args: UserFindUniqueArgs) => {
        if (args.select?.notificationPrefs) return { notificationPrefs: null };
        if (args.select?.email) return { email: 'user@test.com' };
        return null;
      };
      notificationCreateImpl = async (args: NotificationCreateArgs) => ({
        id: 'n1',
        userId: args.data.userId,
        workspaceId: args.data.workspaceId,
        type: args.data.type,
        title: args.data.title,
        body: args.data.body,
        read: false,
        createdAt: new Date(),
      });

      const result = await NotificationService.create({
        userId: 'u1',
        type: 'task_assigned',
        title: 'Task Assigned',
        body: 'You have a new task',
      });

      assert.ok(result);
      assert.equal(result.id, 'n1');
      assert.equal(result.type, 'task_assigned');
      assert.equal(result.title, 'Task Assigned');
      assert.equal(result.body, 'You have a new task');
      assert.equal(result.category, 'task');
      assert.equal(result.priority, 'normal');
      assert.equal(result.archived, false);
      assert.equal(calls[0].method, 'user.findUnique');
      assert.equal(calls[1].method, 'notification.create');
    });

    it('returns null when in-app is disabled for the type', async () => {
      const disabledPrefs = JSON.stringify({
        emailEnabled: true,
        inAppEnabled: true,
        types: { task_assigned: { email: true, inApp: false } },
        digestFrequency: 'daily',
      });
      userFindUniqueImpl = async (args: UserFindUniqueArgs) => {
        if (args.select?.notificationPrefs) return { notificationPrefs: disabledPrefs };
        return null;
      };

      const result = await NotificationService.create({
        userId: 'u1',
        type: 'task_assigned',
        title: 'Test',
      });

      assert.equal(result, null);
      // notification.create should NOT have been called
      const createCalls = calls.filter((c) => c.method === 'notification.create');
      assert.equal(createCalls.length, 0);
    });

    it('sends email when email is enabled for the type', async () => {
      userFindUniqueImpl = async (args: UserFindUniqueArgs) => {
        if (args.select?.notificationPrefs) return { notificationPrefs: null };
        if (args.select?.email) return { email: 'user@test.com' };
        return null;
      };
      notificationCreateImpl = async (args: NotificationCreateArgs) => ({
        id: 'n1',
        userId: args.data.userId,
        workspaceId: args.data.workspaceId,
        type: args.data.type,
        title: args.data.title,
        body: args.data.body,
        read: false,
        createdAt: new Date(),
      });

      await NotificationService.create({
        userId: 'u1',
        type: 'task_assigned', // defaultEmail: true
        title: 'Task Assigned',
        body: 'New task',
      });

      const emailCalls = calls.filter((c) => c.method === 'sendNotificationEmail');
      assert.equal(emailCalls.length, 1);
    });

    it('does not send email when sendEmail is false', async () => {
      userFindUniqueImpl = async (args: UserFindUniqueArgs) => {
        if (args.select?.notificationPrefs) return { notificationPrefs: null };
        if (args.select?.email) return { email: 'user@test.com' };
        return null;
      };
      notificationCreateImpl = async (args: NotificationCreateArgs) => ({
        id: 'n1',
        userId: args.data.userId,
        workspaceId: args.data.workspaceId,
        type: args.data.type,
        title: args.data.title,
        body: args.data.body,
        read: false,
        createdAt: new Date(),
      });

      await NotificationService.create({
        userId: 'u1',
        type: 'task_assigned',
        title: 'Task Assigned',
        sendEmail: false,
      });

      const emailCalls = calls.filter((c) => c.method === 'sendNotificationEmail');
      assert.equal(emailCalls.length, 0);
    });

    it('truncates long titles to 200 characters', async () => {
      userFindUniqueImpl = async () => ({ notificationPrefs: null });
      notificationCreateImpl = async (args: NotificationCreateArgs) => {
        assert.ok(args.data.title.length <= 200);
        return {
          id: 'n1',
          userId: args.data.userId,
          workspaceId: args.data.workspaceId,
          type: args.data.type,
          title: args.data.title,
          body: args.data.body,
          read: false,
          createdAt: new Date(),
        };
      };

      await NotificationService.create({
        userId: 'u1',
        type: 'system',
        title: 'A'.repeat(300),
      });
    });
  });

  describe('createForWorkspace', () => {
    it('creates notifications for all workspace members', async () => {
      membershipFindManyImpl = async () => [
        { userId: 'u1' },
        { userId: 'u2' },
      ];
      userFindUniqueImpl = async (args: UserFindUniqueArgs) => {
        if (args.select?.notificationPrefs) return { notificationPrefs: null };
        return null;
      };
      notificationCreateImpl = async (args: NotificationCreateArgs) => ({
        id: 'n-' + args.data.userId,
        userId: args.data.userId,
        workspaceId: args.data.workspaceId,
        type: args.data.type,
        title: args.data.title,
        body: args.data.body,
        read: false,
        createdAt: new Date(),
      });

      const results = await NotificationService.createForWorkspace('ws-1', {
        type: 'system',
        title: 'Workspace notification',
      });

      assert.equal(results.length, 2);
      assert.equal(results[0].userId, 'u1');
      assert.equal(results[1].userId, 'u2');
    });

    it('returns empty array when no members', async () => {
      membershipFindManyImpl = async () => [];

      const results = await NotificationService.createForWorkspace('ws-1', {
        type: 'system',
        title: 'Test',
      });

      assert.deepEqual(results, []);
    });
  });

  describe('list', () => {
    it('returns notifications for a user', async () => {
      notificationFindManyImpl = async () => [
        {
          id: 'n1',
          userId: 'u1',
          workspaceId: null,
          type: 'system',
          title: 'Test',
          body: JSON.stringify({
            text: 'hello',
            category: 'system',
            priority: 'normal',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: false,
          }),
          read: false,
          createdAt: new Date(),
        },
      ];

      const result = await NotificationService.list('u1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'n1');
      assert.equal(result[0].body, 'hello');
      assert.equal(calls[0].method, 'notification.findMany');
    });

    it('filters unread only', async () => {
      notificationFindManyImpl = async () => [];

      await NotificationService.list('u1', { unreadOnly: true });

      const args = calls[0].args as NotificationFindManyArgs;
      assert.equal(args.where.read, false);
    });

    it('filters by category (envelope filtering)', async () => {
      notificationFindManyImpl = async () => [
        {
          id: 'n1',
          userId: 'u1',
          workspaceId: null,
          type: 'task_assigned',
          title: 'Task',
          body: JSON.stringify({
            text: 't',
            category: 'task',
            priority: 'normal',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: false,
          }),
          read: false,
          createdAt: new Date(),
        },
        {
          id: 'n2',
          userId: 'u1',
          workspaceId: null,
          type: 'system',
          title: 'System',
          body: JSON.stringify({
            text: 's',
            category: 'system',
            priority: 'normal',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: false,
          }),
          read: false,
          createdAt: new Date(),
        },
      ];

      const result = await NotificationService.list('u1', { category: 'task' });

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'n1');
    });

    it('filters out archived by default', async () => {
      notificationFindManyImpl = async () => [
        {
          id: 'n1',
          userId: 'u1',
          workspaceId: null,
          type: 'system',
          title: 'Active',
          body: JSON.stringify({
            text: 'a',
            category: 'system',
            priority: 'normal',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: false,
          }),
          read: false,
          createdAt: new Date(),
        },
        {
          id: 'n2',
          userId: 'u1',
          workspaceId: null,
          type: 'system',
          title: 'Archived',
          body: JSON.stringify({
            text: 'b',
            category: 'system',
            priority: 'normal',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: true,
          }),
          read: false,
          createdAt: new Date(),
        },
      ];

      const result = await NotificationService.list('u1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'n1');
    });

    it('includes archived when includeArchived is true', async () => {
      notificationFindManyImpl = async () => [
        {
          id: 'n1',
          userId: 'u1',
          workspaceId: null,
          type: 'system',
          title: 'Active',
          body: JSON.stringify({
            text: 'a',
            category: 'system',
            priority: 'normal',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: false,
          }),
          read: false,
          createdAt: new Date(),
        },
        {
          id: 'n2',
          userId: 'u1',
          workspaceId: null,
          type: 'system',
          title: 'Archived',
          body: JSON.stringify({
            text: 'b',
            category: 'system',
            priority: 'normal',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: true,
          }),
          read: false,
          createdAt: new Date(),
        },
      ];

      const result = await NotificationService.list('u1', { includeArchived: true });

      assert.equal(result.length, 2);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      notificationFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await NotificationService.list('u1');
      assert.deepEqual(result, []);
    });
  });

  describe('getUnreadCount', () => {
    it('returns the count of unread notifications', async () => {
      notificationCountImpl = async () => 5;

      const result = await NotificationService.getUnreadCount('u1');

      assert.equal(result, 5);
      assert.equal(calls[0].method, 'notification.count');
      const args = calls[0].args as NotificationCountArgs;
      assert.equal(args.where.userId, 'u1');
      assert.equal(args.where.read, false);
    });

    it('returns 0 on error (safePrisma fallback)', async () => {
      notificationCountImpl = async () => { throw new Error('fail'); };

      const result = await NotificationService.getUnreadCount('u1');
      assert.equal(result, 0);
    });
  });

  describe('markAsRead', () => {
    it('marks a single notification as read', async () => {
      notificationUpdateImpl = async (args: NotificationUpdateArgs) => {
        assert.equal(args.data.read, true);
        return { id: args.where.id, read: true };
      };

      const result = await NotificationService.markAsRead('n1');

      assert.ok(result);
      assert.equal(calls[0].method, 'notification.update');
    });

    it('returns null on error (safePrisma fallback)', async () => {
      notificationUpdateImpl = async () => { throw new Error('fail'); };

      const result = await NotificationService.markAsRead('n1');
      assert.equal(result, null);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read and returns count', async () => {
      notificationUpdateManyImpl = async () => ({ count: 3 });

      const result = await NotificationService.markAllAsRead('u1');

      assert.equal(result, 3);
      assert.equal(calls[0].method, 'notification.updateMany');
      const args = calls[0].args as NotificationUpdateManyArgs;
      assert.equal(args.where.userId, 'u1');
      assert.equal(args.data.read, true);
    });

    it('returns 0 on error (safePrisma fallback)', async () => {
      notificationUpdateManyImpl = async () => { throw new Error('fail'); };

      const result = await NotificationService.markAllAsRead('u1');
      assert.equal(result, 0);
    });
  });

  describe('delete', () => {
    it('deletes a notification', async () => {
      notificationDeleteImpl = async (args: NotificationDeleteArgs) => {
        assert.equal(args.where.id, 'n1');
        return { id: 'n1' };
      };

      const result = await NotificationService.delete('n1');

      assert.ok(result);
      assert.equal(calls[0].method, 'notification.delete');
    });

    it('returns null on error (safePrisma fallback)', async () => {
      notificationDeleteImpl = async () => { throw new Error('fail'); };

      const result = await NotificationService.delete('n1');
      assert.equal(result, null);
    });
  });

  describe('archive', () => {
    it('archives a notification by updating the envelope', async () => {
      const envelope = {
        text: 'hello',
        category: 'system',
        priority: 'normal',
        actionUrl: null,
        metadata: {},
        organizationId: null,
        createdBy: null,
        archived: false,
      };
      notificationFindUniqueImpl = async () => ({
        id: 'n1',
        userId: 'u1',
        workspaceId: null,
        type: 'system',
        title: 'Test',
        body: JSON.stringify(envelope),
        read: false,
        createdAt: new Date(),
      });
      notificationUpdateImpl = async (args: NotificationUpdateArgs) => {
        const updatedEnv = JSON.parse(args.data.body as string);
        assert.equal(updatedEnv.archived, true);
        return { id: 'n1', body: args.data.body };
      };

      const result = await NotificationService.archive('n1');

      assert.ok(result);
      assert.equal(calls[0].method, 'notification.findUnique');
      assert.equal(calls[1].method, 'notification.update');
    });

    it('returns null when notification not found', async () => {
      notificationFindUniqueImpl = async () => null;

      const result = await NotificationService.archive('nope');
      assert.equal(result, null);
    });
  });

  describe('getDigest', () => {
    it('returns digest with byCategory and topItems', async () => {
      notificationFindManyImpl = async () => [
        {
          id: 'n1',
          userId: 'u1',
          workspaceId: null,
          type: 'task_assigned',
          title: 'Task 1',
          body: JSON.stringify({
            text: 't1',
            category: 'task',
            priority: 'high',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: false,
          }),
          read: false,
          createdAt: new Date(),
        },
        {
          id: 'n2',
          userId: 'u1',
          workspaceId: null,
          type: 'system',
          title: 'System 1',
          body: JSON.stringify({
            text: 's1',
            category: 'system',
            priority: 'normal',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: false,
          }),
          read: false,
          createdAt: new Date(),
        },
      ];

      const digest = await NotificationService.getDigest('u1');

      assert.equal(digest.totalUnread, 2);
      assert.ok(digest.byCategory.task);
      assert.equal(digest.byCategory.task.count, 1);
      assert.ok(digest.byCategory.system);
      assert.equal(digest.byCategory.system.count, 1);
      assert.equal(digest.topItems.length, 2);
      assert.ok(digest.period.start instanceof Date);
      assert.ok(digest.period.end instanceof Date);
    });

    it('filters out archived items from digest', async () => {
      notificationFindManyImpl = async () => [
        {
          id: 'n1',
          userId: 'u1',
          workspaceId: null,
          type: 'system',
          title: 'Archived',
          body: JSON.stringify({
            text: 'a',
            category: 'system',
            priority: 'normal',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: true,
          }),
          read: false,
          createdAt: new Date(),
        },
      ];

      const digest = await NotificationService.getDigest('u1');

      assert.equal(digest.totalUnread, 0);
      assert.equal(digest.topItems.length, 0);
    });
  });

  describe('processMentions', () => {
    it('extracts @mentions and creates notifications', async () => {
      // The mention lookup by email, then prefs lookup, then email lookup
      userFindUniqueImpl = async (args: UserFindUniqueArgs) => {
        if (args.where?.email) return { id: 'user-bob' };
        if (args.select?.notificationPrefs) return { notificationPrefs: null };
        if (args.select?.email) return { email: 'bob@test.com' };
        return null;
      };
      notificationCreateImpl = async (args: NotificationCreateArgs) => ({
        id: 'n-' + args.data.userId,
        userId: args.data.userId,
        workspaceId: args.data.workspaceId,
        type: args.data.type,
        title: args.data.title,
        body: args.data.body,
        read: false,
        createdAt: new Date(),
      });

      const results = await NotificationService.processMentions(
        'ws-1',
        'org-1',
        'Hey @bob@test.com check this out',
        'author-1',
        'task',
        'task-1',
      );

      assert.equal(results.length, 1);
      assert.equal(results[0].userId, 'user-bob');
      assert.equal(results[0].type, 'mention');
    });

    it('returns empty when no mentions found', async () => {
      const results = await NotificationService.processMentions(
        'ws-1',
        'org-1',
        'No mentions here',
        'author-1',
        'task',
        'task-1',
      );

      assert.deepEqual(results, []);
    });

    it('skips the author mentioning themselves', async () => {
      userFindUniqueImpl = async (args: UserFindUniqueArgs) => {
        if (args.where?.email) return { id: 'author-1' };
        return null;
      };

      const results = await NotificationService.processMentions(
        'ws-1',
        'org-1',
        'Hey @author@test.com',
        'author-1',
        'task',
        'task-1',
      );

      assert.deepEqual(results, []);
    });
  });

  describe('getNotificationPreferences', () => {
    it('returns default preferences when user has no stored prefs', async () => {
      userFindUniqueImpl = async () => null;

      const prefs = await NotificationService.getNotificationPreferences('u1');

      assert.equal(prefs.emailEnabled, true);
      assert.equal(prefs.inAppEnabled, true);
      assert.equal(prefs.digestFrequency, 'daily');
      assert.ok(prefs.types.task_assigned);
      assert.equal(prefs.types.task_assigned?.inApp, true);
    });

    it('returns stored preferences merged with defaults', async () => {
      userFindUniqueImpl = async () => ({
        notificationPrefs: JSON.stringify({
          emailEnabled: false,
          inAppEnabled: true,
          types: { mention: { email: true, inApp: false } },
          digestFrequency: 'hourly',
        }),
      });

      const prefs = await NotificationService.getNotificationPreferences('u1');

      assert.equal(prefs.emailEnabled, false);
      assert.equal(prefs.digestFrequency, 'hourly');
      assert.equal(prefs.types.mention?.inApp, false);
      assert.equal(prefs.types.mention?.email, true);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('merges new prefs with current and persists', async () => {
      userFindUniqueImpl = async () => ({ notificationPrefs: null });
      userUpdateImpl = async (args: UserUpdateArgs) => {
        assert.equal(args.where.id, 'u1');
        const stored = JSON.parse(args.data.notificationPrefs as string);
        assert.equal(stored.emailEnabled, false);
        return { id: 'u1' };
      };

      const result = await NotificationService.updateNotificationPreferences('u1', {
        emailEnabled: false,
      });

      assert.equal(result.emailEnabled, false);
      assert.equal(result.inAppEnabled, true); // preserved from defaults
      assert.equal(calls[0].method, 'user.findUnique');
      assert.equal(calls[1].method, 'user.update');
    });
  });

  describe('getNotificationStats', () => {
    it('aggregates stats by type, category, and priority', async () => {
      notificationFindManyImpl = async () => [
        {
          type: 'task_assigned',
          body: JSON.stringify({
            text: 't',
            category: 'task',
            priority: 'high',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: false,
          }),
          read: false,
        },
        {
          type: 'task_assigned',
          body: JSON.stringify({
            text: 't2',
            category: 'task',
            priority: 'normal',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: false,
          }),
          read: true,
        },
        {
          type: 'system',
          body: JSON.stringify({
            text: 's',
            category: 'system',
            priority: 'normal',
            actionUrl: null,
            metadata: {},
            organizationId: null,
            createdBy: null,
            archived: true,
          }),
          read: false,
        },
      ];

      const stats = await NotificationService.getNotificationStats('u1');

      assert.equal(stats.total, 3);
      assert.equal(stats.unread, 1); // one unread non-archived
      assert.equal(stats.byType.task_assigned, 2);
      assert.equal(stats.byType.system, undefined); // archived is skipped
      assert.equal(stats.byCategory.task, 2);
      assert.equal(stats.byPriority.high, 1);
      assert.equal(stats.byPriority.normal, 1);
    });

    it('returns zero stats on error (safePrisma fallback)', async () => {
      notificationFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await NotificationService.getNotificationStats('u1');

      assert.equal(stats.total, 0);
      assert.equal(stats.unread, 0);
    });
  });
});
